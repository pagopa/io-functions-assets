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
  SERVICE_MODEL_ID_FIELD,
  ServiceModel
} from "io-functions-commons/dist/src/models/service";

import { identity } from "fp-ts/lib/function";
import { isSome } from "fp-ts/lib/Option";
import { taskEither } from "fp-ts/lib/TaskEither";
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

const getServiceByLatestRevisionTask = (
  serviceModel: ServiceModel,
  serviceId: ServiceId
) =>
  serviceModel
    .findOneByQuery({
      parameters: [
        {
          name: "@serviceId",
          value: serviceId
        }
      ],
      // StringEquals is necessary to avoid 404 in case serviceId is in lowercase format into cosmosdb's service collection
      query: `SELECT * FROM m WHERE StringEquals(m.${SERVICE_MODEL_ID_FIELD}, @serviceId, true) ORDER BY m.version DESC`
    })

    .chain(maybeService =>
      taskEither.of(
        isSome(maybeService)
          ? ResponseSuccessJson(retrievedServiceToPublic(maybeService.value))
          : ResponseErrorNotFound(
              "Service not found",
              "The service you requested was not found in the system."
            )
      )
    );

export function GetServiceByLatestRevisionHandler(
  serviceModel: ServiceModel
): IGetServiceByLatestRevisionHandler {
  return async serviceId =>
    getServiceByLatestRevisionTask(serviceModel, serviceId)
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
    RequiredParamMiddleware("serviceid", NonEmptyString)
  );
  return wrapRequestHandler(middlewaresWrap(handler));
}
