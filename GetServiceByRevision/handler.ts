/*
 * Implements the Public API handlers for the Services resource.
 */

import * as express from "express";

import {
  IResponseErrorNotFound,
  IResponseSuccessJson,
  ResponseErrorNotFound,
  ResponseSuccessJson
} from "italia-ts-commons/lib/responses";

import { NonEmptyString } from "italia-ts-commons/lib/strings";

import { RequiredParamMiddleware } from "io-functions-commons/dist/src/utils/middlewares/required_param";
import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "io-functions-commons/dist/src/utils/request_middleware";
import {
  IResponseErrorQuery,
  ResponseErrorQuery
} from "io-functions-commons/dist/src/utils/response";

import {
  RetrievedService,
  ServiceModel
} from "io-functions-commons/dist/src/models/service";

import { rights } from "fp-ts/lib/Array";
import { identity } from "fp-ts/lib/function";
import { taskEither, tryCatch } from "fp-ts/lib/TaskEither";
import {
  NotificationChannel,
  NotificationChannelEnum
} from "io-functions-commons/dist/generated/definitions/NotificationChannel";
import { ServiceId } from "io-functions-commons/dist/generated/definitions/ServiceId";
import { ServicePublic } from "io-functions-commons/dist/generated/definitions/ServicePublic";
import {
  asyncIterableToArray,
  flattenAsyncIterable
} from "io-functions-commons/dist/src/utils/async";
import { toCosmosErrorResponse } from "io-functions-commons/dist/src/utils/cosmosdb_model";
import { toApiServiceMetadata } from "io-functions-commons/dist/src/utils/service_metadata";
import { NonNegativeInteger } from "italia-ts-commons/lib/numbers";

type IGetServiceByRevisionHandlerRet =
  | IResponseSuccessJson<ServicePublic>
  | IResponseErrorNotFound
  | IResponseErrorQuery;

type IGetServiceByRevisionHandler = (
  serviceId: ServiceId,
  version: NonNegativeInteger
) => Promise<IGetServiceByRevisionHandlerRet>;

export function serviceAvailableNotificationChannels(
  retrievedService: RetrievedService
): ReadonlyArray<NotificationChannel> {
  if (retrievedService.requireSecureChannels) {
    return [NotificationChannelEnum.WEBHOOK];
  }
  return [NotificationChannelEnum.EMAIL, NotificationChannelEnum.WEBHOOK];
}

/**
 * Converts a retrieved service to a service that can be shared via API
 */
function retrievedServiceToPublic(
  retrievedService: RetrievedService
): ServicePublic {
  return {
    available_notification_channels: serviceAvailableNotificationChannels(
      retrievedService
    ),
    department_name: retrievedService.departmentName,
    organization_fiscal_code: retrievedService.organizationFiscalCode,
    organization_name: retrievedService.organizationName,
    service_id: retrievedService.serviceId,
    service_metadata: retrievedService.serviceMetadata
      ? toApiServiceMetadata(retrievedService.serviceMetadata)
      : undefined,
    service_name: retrievedService.serviceName,
    version: retrievedService.version
  };
}

const getServiceByRevisionTask = (
  serviceModel: ServiceModel,
  serviceId: ServiceId,
  version: NonNegativeInteger
) =>
  tryCatch(
    () =>
      asyncIterableToArray(
        flattenAsyncIterable(
          serviceModel.getQueryIterator({
            parameters: [
              {
                name: "@serviceId",
                value: serviceId
              },
              {
                name: "@version",
                value: version
              }
            ],
            query: `SELECT * FROM m WHERE m.serviceId = @serviceId and m.version = @version`
          })
        )
      ),
    toCosmosErrorResponse
  )
    .map(rights)
    .chain(results =>
      taskEither.of(
        results.length > 0
          ? ResponseSuccessJson(retrievedServiceToPublic(results[0]))
          : ResponseErrorNotFound(
              "Service not found",
              "The service you requested was not found in the system."
            )
      )
    );

export function GetServiceByRevisionHandler(
  serviceModel: ServiceModel
): IGetServiceByRevisionHandler {
  return async (serviceId, version) =>
    getServiceByRevisionTask(serviceModel, serviceId, version)
      .fold<IGetServiceByRevisionHandlerRet>(
        error =>
          ResponseErrorQuery("Error while retrieving the service", error),
        identity
      )
      .run();
}

/**
 * Wraps a GetService handler inside an Express request handler.
 */
export function GetServiceByRevision(
  serviceModel: ServiceModel
): express.RequestHandler {
  const handler = GetServiceByRevisionHandler(serviceModel);
  const middlewaresWrap = withRequestMiddlewares(
    RequiredParamMiddleware("serviceid", NonEmptyString),
    RequiredParamMiddleware("version", NonNegativeInteger)
  );
  return wrapRequestHandler(middlewaresWrap(handler));
}
