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
  ServiceMetadata,
  ServiceModel
} from "io-functions-commons/dist/src/models/service";

import { ServiceId } from "io-functions-commons/dist/generated/definitions/ServiceId";
import { toApiServiceMetadata } from "io-functions-commons/dist/src/utils/service_metadata";

type IGetServiceMetadataHandlerRet =
  | IResponseSuccessJson<ServiceMetadata>
  | IResponseErrorNotFound
  | IResponseErrorQuery;

type IGetServiceMetadataHandler = (
  serviceId: ServiceId
) => Promise<IGetServiceMetadataHandlerRet>;

/**
 * Extracts the serviceId value from the URL path parameter.
 */
const requiredServiceIdMiddleware = RequiredParamMiddleware(
  "serviceid",
  NonEmptyString
);

export function GetServiceMetadataHandler(
  serviceModel: ServiceModel
): IGetServiceMetadataHandler {
  return async serviceId =>
    (
      await serviceModel
        // tslint:disable-next-line: no-useless-cast
        .findLastVersionByModelId([serviceId.toUpperCase() as NonEmptyString])
        .run()
    ).fold<IGetServiceMetadataHandlerRet>(
      error => ResponseErrorQuery("Error while retrieving the service", error),
      maybeService =>
        maybeService.foldL<
          IResponseErrorNotFound | IResponseSuccessJson<ServiceMetadata>
        >(
          () =>
            ResponseErrorNotFound(
              "Service not found",
              "The service you requested was not found in the system."
            ),
          service =>
            service.serviceMetadata
              ? ResponseSuccessJson(
                  toApiServiceMetadata(service.serviceMetadata)
                )
              : ResponseErrorNotFound(
                  "Service metadata not found",
                  "The service you requested doesn't have metadata attribute."
                )
        )
    );
}

/**
 * Wraps a GetService handler inside an Express request handler.
 */
export function GetServiceMetadata(
  serviceModel: ServiceModel
): express.RequestHandler {
  const handler = GetServiceMetadataHandler(serviceModel);
  const middlewaresWrap = withRequestMiddlewares(requiredServiceIdMiddleware);
  return wrapRequestHandler(middlewaresWrap(handler));
}
