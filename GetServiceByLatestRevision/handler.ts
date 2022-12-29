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

import { RequiredParamMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_param";
import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";
import {
  IResponseErrorQuery,
  ResponseErrorQuery
} from "@pagopa/io-functions-commons/dist/src/utils/response";

import { ServiceId } from "@pagopa/io-functions-commons/dist/generated/definitions/ServiceId";
import { ServicePublic } from "@pagopa/io-functions-commons/dist/generated/definitions/ServicePublic";
import { ServiceModel } from "@pagopa/io-functions-commons/dist/src/models/service";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import { retrievedServiceToPublic } from "../utils/services";

type IGetServiceByLatestRevisionHandlerRet =
  | IResponseSuccessJson<ServicePublic>
  | IResponseErrorNotFound
  | IResponseErrorQuery;

type IGetServiceByLatestRevisionHandler = (
  serviceId: ServiceId
) => Promise<IGetServiceByLatestRevisionHandlerRet>;

export const GetServiceByLatestRevisionHandler = (
  serviceModel: ServiceModel
): IGetServiceByLatestRevisionHandler => async (
  serviceId
): Promise<IGetServiceByLatestRevisionHandlerRet> =>
  pipe(
    serviceModel.findLastVersionByModelId([serviceId]),
    TE.mapLeft(error =>
      ResponseErrorQuery("Error while retrieving the service", error)
    ),
    TE.chainW(
      TE.fromOption(() =>
        ResponseErrorNotFound(
          "Service not found",
          "The service you requested was not found in the system."
        )
      )
    ),
    TE.map(service => ResponseSuccessJson(retrievedServiceToPublic(service))),
    TE.toUnion
  )();

/**
 * Wraps a GetService handler inside an Express request handler.
 */
export const GetServiceByLatestRevision = (
  serviceModel: ServiceModel
): express.RequestHandler => {
  const handler = GetServiceByLatestRevisionHandler(serviceModel);
  const middlewaresWrap = withRequestMiddlewares(
    RequiredParamMiddleware("serviceid", ServiceId)
  );
  return wrapRequestHandler(middlewaresWrap(handler));
};
