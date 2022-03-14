import * as t from "io-ts";

import * as express from "express";

import { BlobService } from "azure-storage";

import {
  IResponseErrorInternal,
  IResponseSuccessJson,
  ResponseErrorInternal,
  ResponseSuccessJson
} from "@pagopa/ts-commons/lib/responses";

import {
  toServicesTuple,
  VISIBLE_SERVICE_BLOB_ID,
  VISIBLE_SERVICE_CONTAINER,
  VisibleService
} from "@pagopa/io-functions-commons/dist/src/models/visible_service";

import { getBlobAsObject } from "@pagopa/io-functions-commons/dist/src/utils/azure_storage";
import { wrapRequestHandler } from "@pagopa/io-functions-commons/dist/src/utils/request_middleware";

import { PaginatedServiceTupleCollection } from "@pagopa/io-functions-commons/dist/generated/definitions/PaginatedServiceTupleCollection";
import { ServiceId } from "@pagopa/io-functions-commons/dist/generated/definitions/ServiceId";

import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/lib/Option";

type IGetVisibleServicesHandlerRet =
  | IResponseSuccessJson<PaginatedServiceTupleCollection>
  | IResponseErrorInternal;

type IGetVisibleServicesHandler = () => Promise<IGetVisibleServicesHandlerRet>;

export function GetVisibleServicesHandler(
  blobService: BlobService
): IGetVisibleServicesHandler {
  return async () => {
    const errorOrMaybeVisibleServicesJson = await getBlobAsObject(
      t.record(ServiceId, VisibleService),
      blobService,
      VISIBLE_SERVICE_CONTAINER,
      VISIBLE_SERVICE_BLOB_ID
    );
    return pipe(
      errorOrMaybeVisibleServicesJson,
      E.bimap(
        error =>
          ResponseErrorInternal(
            `Error getting visible services list: ${error.message}`
          ),
        maybeVisibleServicesJson => {
          const servicesTuples = pipe(
            maybeVisibleServicesJson,
            // tslint:disable-next-line: no-inferred-empty-object-type
            O.getOrElse(() => ({})),
            Object.entries,
            _ => new Map<string, VisibleService>(_),
            toServicesTuple
          );

          return ResponseSuccessJson({
            items: servicesTuples,
            page_size: servicesTuples.length
          });
        }
      ),
      E.toUnion
    );
  };
}

/**
 * Wraps a GetVisibleServices handler inside an Express request handler.
 */
export function GetVisibleServices(
  blobService: BlobService
): express.RequestHandler {
  const handler = GetVisibleServicesHandler(blobService);
  return wrapRequestHandler(handler);
}
