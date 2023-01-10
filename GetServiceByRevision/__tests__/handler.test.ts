// eslint-disable no-any

import {
  NonNegativeInteger,
  NonNegativeIntegerFromString
} from "@pagopa/ts-commons/lib/numbers";
import {
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";

import {
  NewService,
  RetrievedService,
  Service,
  toAuthorizedCIDRs,
  toAuthorizedRecipients
} from "@pagopa/io-functions-commons/dist/src/models/service";

import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";

import { MaxAllowedPaymentAmount } from "@pagopa/io-functions-commons/dist/generated/definitions/MaxAllowedPaymentAmount";
import { NotificationChannelEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/NotificationChannel";
import { ServicePublic } from "@pagopa/io-functions-commons/dist/generated/definitions/ServicePublic";
import { toCosmosErrorResponse } from "@pagopa/io-functions-commons/dist/src/utils/cosmosdb_model";
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

describe("GetServiceByRevisionHandler", () => {
  it("should get an existing service by a given revision", async () => {
    const serviceModelMock = {
      findOneByQuery: jest.fn(() => TE.of(O.some(aRetrievedService)))
    };
    const aServiceId = "1" as NonEmptyString;
    const getServiceByRevisionHandler = GetServiceByRevisionHandler(
      serviceModelMock as any
    );
    const response = await getServiceByRevisionHandler(aServiceId, aVersion);
    expect(serviceModelMock.findOneByQuery).toHaveBeenCalledTimes(1);
    expect(response.kind).toBe("IResponseSuccessJson");
    if (response.kind === "IResponseSuccessJson") {
      expect(response.value).toEqual(aSeralizedService);
    }
  });
  it("should fail on errors during get", async () => {
    const serviceModelMock = {
      findOneByQuery: jest.fn(() => TE.left(toCosmosErrorResponse("error")))
    };
    const aServiceId = "1" as NonEmptyString;
    const getServiceByRevisionHandler = GetServiceByRevisionHandler(
      serviceModelMock as any
    );
    const response = await getServiceByRevisionHandler(aServiceId, aVersion);
    expect(serviceModelMock.findOneByQuery).toHaveBeenCalledTimes(1);
    expect(response.kind).toBe("IResponseErrorQuery");
  });
  it("should return not found if the service does not exist", async () => {
    const serviceModelMock = {
      findOneByQuery: jest.fn(() => TE.of(O.none))
    };
    const aServiceId = "1" as NonEmptyString;
    const getServiceByRevisionHandler = GetServiceByRevisionHandler(
      serviceModelMock as any
    );
    const response = await getServiceByRevisionHandler(
      aServiceId,
      999 as NonNegativeInteger
    );
    expect(serviceModelMock.findOneByQuery).toHaveBeenCalledTimes(1);
    expect(response.kind).toBe("IResponseErrorNotFound");
  });
});

describe("NonNegativeIntegerFromString", () => {
  it("should get integer 1 from string '1'", async () => {
    const n = NonNegativeIntegerFromString.decode("1");

    expect(E.isRight(n)).toBeTruthy();
    expect(E.getOrElse(() => -1)(n)).toEqual(1);
  });

  it("should get error from string '-1'", () => {
    const n = NonNegativeIntegerFromString.decode("-1");
    expect(E.isLeft(n)).toBeTruthy();
  });
});
