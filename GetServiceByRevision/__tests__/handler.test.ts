// tslint:disable:no-any

import { NonNegativeInteger } from "italia-ts-commons/lib/numbers";
import {
  NonEmptyString,
  OrganizationFiscalCode
} from "italia-ts-commons/lib/strings";

import {
  NewService,
  RetrievedService,
  Service,
  toAuthorizedCIDRs,
  toAuthorizedRecipients
} from "io-functions-commons/dist/src/models/service";

import { MaxAllowedPaymentAmount } from "io-functions-commons/dist/generated/definitions/MaxAllowedPaymentAmount";
import { ServicePublic } from "io-functions-commons/dist/generated/definitions/ServicePublic";

import { right } from "fp-ts/lib/Either";
import { NotificationChannelEnum } from "io-functions-commons/dist/generated/definitions/NotificationChannel";
import * as asyncI from "io-functions-commons/dist/src/utils/async";
import { aCosmosResourceMetadata } from "../../__mocks__/mocks";
import { GetServiceByRevisionHandler } from "../handler";

afterEach(() => {
  jest.resetAllMocks();
  jest.restoreAllMocks();
});

const anOrganizationFiscalCode = "01234567890" as OrganizationFiscalCode;

const aServicePayload: ServicePublic = {
  department_name: "MyDeptName" as NonEmptyString,
  organization_fiscal_code: anOrganizationFiscalCode,
  organization_name: "MyOrgName" as NonEmptyString,
  service_id: "MySubscriptionId" as NonEmptyString,
  service_name: "MyServiceName" as NonEmptyString,
  version: 1
};

const aService: Service = {
  authorizedCIDRs: toAuthorizedCIDRs([]),
  authorizedRecipients: toAuthorizedRecipients([]),
  departmentName: "MyDeptName" as NonEmptyString,
  isVisible: true,
  maxAllowedPaymentAmount: 0 as MaxAllowedPaymentAmount,
  organizationFiscalCode: anOrganizationFiscalCode,
  organizationName: "MyOrgName" as NonEmptyString,
  requireSecureChannels: false,
  serviceId: "MySubscriptionId" as NonEmptyString,
  serviceName: "MyServiceName" as NonEmptyString
};

const aNewService: NewService = {
  ...aService,
  kind: "INewService"
};

const aVersion = 1 as NonNegativeInteger;

const aRetrievedService: RetrievedService = {
  ...aNewService,
  ...aCosmosResourceMetadata,
  id: "123" as NonEmptyString,
  kind: "IRetrievedService",
  version: aVersion
};

const aSeralizedService: ServicePublic = {
  ...aServicePayload,
  available_notification_channels: [
    NotificationChannelEnum.EMAIL,
    NotificationChannelEnum.WEBHOOK
  ],
  version: aVersion
};

const resultsMock: ReadonlyArray<any> = [[right(aRetrievedService)]];

const aServiceIteratorMock = {
  next: jest.fn(() =>
    Promise.resolve({
      value: jest.fn(() => resultsMock)
    })
  )
};

const anErrorServiceIteratorMock = {
  next: jest.fn(() => Promise.reject("Error"))
};

const aFlattenAsyncIterableImpl = () => {
  return {
    [Symbol.asyncIterator]: () => aServiceIteratorMock
  };
};

describe("GetServiceByRevisionHandler", () => {
  it("should get an existing service by a given revision", async () => {
    const serviceModelMock = {
      getQueryIterator: jest.fn(() => aServiceIteratorMock)
    };

    jest
      .spyOn(asyncI, "asyncIterableToArray")
      .mockImplementationOnce(() =>
        Promise.resolve([right(aRetrievedService)])
      );
    jest
      .spyOn(asyncI, "flattenAsyncIterable")
      .mockImplementationOnce(aFlattenAsyncIterableImpl);
    const aServiceId = "1" as NonEmptyString;
    const getServiceByRevisionHandler = GetServiceByRevisionHandler(
      serviceModelMock as any
    );
    const response = await getServiceByRevisionHandler(aServiceId, aVersion);
    expect(serviceModelMock.getQueryIterator).toHaveBeenCalledTimes(1);
    expect(response.kind).toBe("IResponseSuccessJson");
    if (response.kind === "IResponseSuccessJson") {
      expect(response.value).toEqual(aSeralizedService);
    }
  });
  it("should fail on errors during get", async () => {
    const serviceModelMock = {
      getQueryIterator: jest.fn(() => anErrorServiceIteratorMock)
    };

    jest
      .spyOn(asyncI, "asyncIterableToArray")
      .mockImplementationOnce(() => Promise.reject("Error"));

    jest.spyOn(asyncI, "flattenAsyncIterable").mockImplementationOnce(() => {
      return {
        [Symbol.asyncIterator]: () => anErrorServiceIteratorMock
      };
    });
    const aServiceId = "1" as NonEmptyString;
    const getServiceByRevisionHandler = GetServiceByRevisionHandler(
      serviceModelMock as any
    );
    const response = await getServiceByRevisionHandler(aServiceId, aVersion);
    expect(serviceModelMock.getQueryIterator).toHaveBeenCalledTimes(1);
    expect(response.kind).toBe("IResponseErrorQuery");
  });
  it("should return not found if the service does not exist", async () => {
    const serviceModelMock = {
      getQueryIterator: jest.fn(() => aServiceIteratorMock)
    };
    jest
      .spyOn(asyncI, "asyncIterableToArray")
      .mockImplementationOnce(() => Promise.resolve([]));

    jest
      .spyOn(asyncI, "flattenAsyncIterable")
      .mockImplementationOnce(aFlattenAsyncIterableImpl);
    const aServiceId = "1" as NonEmptyString;
    const getServiceByRevisionHandler = GetServiceByRevisionHandler(
      serviceModelMock as any
    );
    const response = await getServiceByRevisionHandler(
      aServiceId,
      999 as NonNegativeInteger
    );
    expect(serviceModelMock.getQueryIterator).toHaveBeenCalledTimes(1);
    expect(response.kind).toBe("IResponseErrorNotFound");
  });
});
