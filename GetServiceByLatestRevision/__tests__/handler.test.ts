// tslint:disable:no-any

import { NonEmptyString } from "italia-ts-commons/lib/strings";

import { none, some } from "fp-ts/lib/Option";
import { fromLeft, taskEither } from "fp-ts/lib/TaskEither";
import { toCosmosErrorResponse } from "io-functions-commons/dist/src/utils/cosmosdb_model";
import { aRetrievedService, aSeralizedService } from "../../__mocks__/mocks";
import { GetServiceByLatestRevisionHandler } from "../handler";

afterEach(() => {
  jest.resetAllMocks();
  jest.restoreAllMocks();
});

describe("GetServiceByLatestRevisionHandler", () => {
  it("should get an existing service by a given revision", async () => {
    const serviceModelMock = {
      findOneByQuery: jest.fn(() => taskEither.of(some(aRetrievedService)))
    };
    const aServiceId = "1" as NonEmptyString;
    const getServiceByLatestRevisionHandler = GetServiceByLatestRevisionHandler(
      serviceModelMock as any
    );
    const response = await getServiceByLatestRevisionHandler(aServiceId);
    expect(serviceModelMock.findOneByQuery).toHaveBeenCalledTimes(1);
    expect(response.kind).toBe("IResponseSuccessJson");
    if (response.kind === "IResponseSuccessJson") {
      expect(response.value).toEqual(aSeralizedService);
    }
  });
  it("should fail on errors during get", async () => {
    const serviceModelMock = {
      findOneByQuery: jest.fn(() => fromLeft(toCosmosErrorResponse("error")))
    };
    const aServiceId = "1" as NonEmptyString;
    const getServiceByLatestRevisionHandler = GetServiceByLatestRevisionHandler(
      serviceModelMock as any
    );
    const response = await getServiceByLatestRevisionHandler(aServiceId);
    expect(serviceModelMock.findOneByQuery).toHaveBeenCalledTimes(1);
    expect(response.kind).toBe("IResponseErrorQuery");
  });
  it("should return not found if the service does not exist", async () => {
    const serviceModelMock = {
      findOneByQuery: jest.fn(() => taskEither.of(none))
    };
    const aServiceId = "1" as NonEmptyString;
    const getServiceByLatestRevisionHandler = GetServiceByLatestRevisionHandler(
      serviceModelMock as any
    );
    const response = await getServiceByLatestRevisionHandler(aServiceId);
    expect(serviceModelMock.findOneByQuery).toHaveBeenCalledTimes(1);
    expect(response.kind).toBe("IResponseErrorNotFound");
  });
});
