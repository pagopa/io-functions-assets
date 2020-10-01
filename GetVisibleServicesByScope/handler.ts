import * as t from "io-ts";

import * as express from "express";

import { BlobService } from "azure-storage";

import {
  IResponseErrorInternal,
  IResponseSuccessJson,
  ResponseErrorInternal,
  ResponseSuccessJson
} from "italia-ts-commons/lib/responses";

import {
  VISIBLE_SERVICE_CONTAINER,
  VisibleService
} from "io-functions-commons/dist/src/models/visible_service";

import { ServiceId } from "io-functions-commons/dist/generated/definitions/ServiceId";
import { getBlobAsObject } from "io-functions-commons/dist/src/utils/azure_storage";
import { wrapRequestHandler } from "io-functions-commons/dist/src/utils/request_middleware";
import { NonEmptyString } from "italia-ts-commons/lib/strings";

const ServicesByScope = t.partial({
  LOCAL: t.array(ServiceId),
  NATIONAL: t.array(ServiceId)
});

export type ServicesByScope = t.TypeOf<typeof ServicesByScope>;

type IGetVisibleServicesByScopeHandlerRet =
  | IResponseSuccessJson<ServicesByScope>
  | IResponseErrorInternal;

type IGetVisibleServicesByScopeHandler = () => Promise<
  IGetVisibleServicesByScopeHandlerRet
>;

/**
 * Returns all the visible services (is_visible = true) grouped by its scope.
 */
export function GetVisibleServicesByScopeHandler(
  blobService: BlobService,
  servicesByScopeBlobId: NonEmptyString
): IGetVisibleServicesByScopeHandler {
  return async () => {
    const errorOrMaybeVisibleServicesByScopeJson = await getBlobAsObject(
      ServicesByScope,
      blobService,
      VISIBLE_SERVICE_CONTAINER,
      servicesByScopeBlobId
    );
    return errorOrMaybeVisibleServicesByScopeJson.fold<
      IGetVisibleServicesByScopeHandlerRet
    >(
      error =>
        ResponseErrorInternal(
          `Error getting visible services by scope list: ${error.message}`
        ),
      maybeVisibleServicesByScopeJson => {
        return ResponseSuccessJson(
          maybeVisibleServicesByScopeJson.getOrElse({})
        );
      }
    );
  };
}

/**
 * Wraps a GetVisibleServices handler inside an Express request handler.
 */
export function GetVisibleServicesByScope(
  blobService: BlobService,
  servicesByScopeBlobId: NonEmptyString
): express.RequestHandler {
  const handler = GetVisibleServicesByScopeHandler(
    blobService,
    servicesByScopeBlobId
  );
  return wrapRequestHandler(handler);
}
