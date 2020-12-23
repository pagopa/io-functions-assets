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

import { none, some } from "fp-ts/lib/Option";
import { fromLeft, taskEither } from "fp-ts/lib/TaskEither";
import { NotificationChannelEnum } from "io-functions-commons/dist/generated/definitions/NotificationChannel";
import { toCosmosErrorResponse } from "io-functions-commons/dist/src/utils/cosmosdb_model";
import { aCosmosResourceMetadata } from "../../__mocks__/mocks";
import { GetServiceByLatestRevisionHandler } from "../handler";

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
