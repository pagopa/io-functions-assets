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
  SERVICE_MODEL_PK_FIELD,
  ServiceMetadata,
  ServiceModel,
  RetrievedService
} from "@pagopa/io-functions-commons/dist/src/models/service";

import { ServiceId } from "@pagopa/io-functions-commons/dist/generated/definitions/ServiceId";
import { toApiServiceMetadata } from "@pagopa/io-functions-commons/dist/src/utils/service_metadata";

import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";
import { CosmosErrors } from "@pagopa/io-functions-commons/dist/src/utils/cosmosdb_model";

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

/**
 *
 * @param serviceModel Cosmos Model for Service
 * @param serviceId The id of the Service to retrieve
 * @returns
 */
const findService = (
  serviceModel: ServiceModel,
  serviceId: NonEmptyString
): TE.TaskEither<CosmosErrors, O.Option<RetrievedService>> =>
  serviceModel.findOneByQuery(
    {
      parameters: [
        {
          name: "@serviceId",
          value: serviceId
        }
      ],
      // StringEquals is necessary to avoid 404 in case serviceId is in lowercase format into cosmosdb's service collection
      query: `SELECT * FROM n WHERE StringEquals(n.${SERVICE_MODEL_PK_FIELD}, @serviceId, true) ORDER BY n.version DESC`
    },
    {
      maxItemCount: 1
    }
  );

/**
 *
 * @param serviceModel
 * @returns
 */

export const GetServiceMetadataHandler = (
  serviceModel: ServiceModel
): IGetServiceMetadataHandler => async (
  serviceId
): ReturnType<IGetServiceMetadataHandler> =>
  pipe(
    findService(serviceModel, serviceId),
    TE.mapLeft(error =>
      ResponseErrorQuery("Error while retrieving the service", error)
    ),
    TE.map(
      O.fold(
        () =>
          ResponseErrorNotFound(
            "Service not found",
            "The service you requested was not found in the system."
          ),
        service =>
          service.serviceMetadata
            ? ResponseSuccessJson(toApiServiceMetadata(service.serviceMetadata))
            : ResponseErrorNotFound(
                "Service metadata not found",
                "The service you requested doesn't have metadata attribute."
              )
      )
    ),
    TE.toUnion
  )();

/**
 * Wraps a GetService handler inside an Express request handler.
 */
export const GetServiceMetadata = (
  serviceModel: ServiceModel
): express.RequestHandler => {
  const handler = GetServiceMetadataHandler(serviceModel);
  const middlewaresWrap = withRequestMiddlewares(requiredServiceIdMiddleware);
  return wrapRequestHandler(middlewaresWrap(handler));
};
