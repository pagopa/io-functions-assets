/*
 * Implements the Public API handlers for the Services resource.
 */

import * as express from "express";

import {
  IResponseErrorNotFound,
  IResponseSuccessJson,
  ResponseErrorNotFound,
  ResponseSuccessJson
} from "@pagopa/ts-commons/lib/responses";

import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";

import { RequiredParamMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_param";
import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
import {
  IResponseErrorQuery,
  ResponseErrorQuery
} from "@pagopa/io-functions-commons/dist/src/utils/response";

import {
  RetrievedService,
  SERVICE_MODEL_ID_FIELD,
  ServiceModel
} from "@pagopa/io-functions-commons/dist/src/models/service";

import {
  NonNegativeInteger,
  NonNegativeIntegerFromString
} from "@pagopa/ts-commons/lib/numbers";

import { flow, pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";

import {
  NotificationChannel,
  NotificationChannelEnum
} from "@pagopa/io-functions-commons/dist/generated/definitions/NotificationChannel";
import { ServiceId } from "@pagopa/io-functions-commons/dist/generated/definitions/ServiceId";
import { ServicePublic } from "@pagopa/io-functions-commons/dist/generated/definitions/ServicePublic";
import { toApiServiceMetadata } from "@pagopa/io-functions-commons/dist/src/utils/service_metadata";

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
  pipe(
    serviceModel.findOneByQuery({
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
      query: `SELECT * FROM m WHERE m.${SERVICE_MODEL_ID_FIELD} = @serviceId and m.version = @version`
    }),
    TE.chainW(
      flow(
        O.foldW(
          () =>
            ResponseErrorNotFound(
              "Service not found",
              "The service you requested was not found in the system."
            ),
          service => flow(retrievedServiceToPublic, ResponseSuccessJson)
        ),
        TE.of
      )
    )
  );

export function GetServiceByRevisionHandler(
  serviceModel: ServiceModel
): IGetServiceByRevisionHandler {
  return async (serviceId, version) =>
    pipe(
      getServiceByRevisionTask(serviceModel, serviceId, version),
      TE.mapLeft(error =>
        ResponseErrorQuery("Error while retrieving the service", error)
      ),
      TE.toUnion
    )();
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
    RequiredParamMiddleware("version", NonNegativeIntegerFromString)
  );
  return wrapRequestHandler(middlewaresWrap(handler));
}
