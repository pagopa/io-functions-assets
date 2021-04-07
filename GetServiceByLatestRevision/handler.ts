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
  SERVICE_MODEL_ID_FIELD,
  ServiceModel
} from "io-functions-commons/dist/src/models/service";

import { identity } from "fp-ts/lib/function";
import { ServiceId } from "io-functions-commons/dist/generated/definitions/ServiceId";
import { ServicePublic } from "io-functions-commons/dist/generated/definitions/ServicePublic";
import { retrievedServiceToPublic } from "../utils/services";

type IGetServiceByLatestRevisionHandlerRet =
  | IResponseSuccessJson<ServicePublic>
  | IResponseErrorNotFound
  | IResponseErrorQuery;

type IGetServiceByLatestRevisionHandler = (
  serviceId: ServiceId
) => Promise<IGetServiceByLatestRevisionHandlerRet>;

export function GetServiceByLatestRevisionHandler(
  serviceModel: ServiceModel
): IGetServiceByLatestRevisionHandler {
  return async serviceId =>
    serviceModel
      .findOneByQuery({
        parameters: [
          {
            name: "@serviceId",
            value: serviceId
          }
        ],
        // StringEquals is necessary to avoid 404 in case serviceId is in lowercase format into cosmosdb's service collection
        query: `SELECT TOP 1 * FROM m WHERE StringEquals(m.${SERVICE_MODEL_ID_FIELD}, @serviceId, true) ORDER BY m.version DESC`
      })

      .map(maybeService =>
        maybeService.fold<
          IResponseErrorNotFound | IResponseSuccessJson<ServicePublic>
        >(
          ResponseErrorNotFound(
            "Service not found",
            "The service you requested was not found in the system."
          ),
          service => ResponseSuccessJson(retrievedServiceToPublic(service))
        )
      )

      .fold<IGetServiceByLatestRevisionHandlerRet>(
        error =>
          ResponseErrorQuery("Error while retrieving the service", error),
        identity
      )
      .run();
}

/**
 * Wraps a GetService handler inside an Express request handler.
 */
export function GetServiceByLatestRevision(
  serviceModel: ServiceModel
): express.RequestHandler {
  const handler = GetServiceByLatestRevisionHandler(serviceModel);
  const middlewaresWrap = withRequestMiddlewares(
    RequiredParamMiddleware("serviceid", ServiceId)
  );
  return wrapRequestHandler(middlewaresWrap(handler));
}
