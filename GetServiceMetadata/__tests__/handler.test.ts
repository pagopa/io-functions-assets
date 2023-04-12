// eslint-disable no-any

import { none, some } from "fp-ts/lib/Option";

import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers";
import {
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";

import {
  NewService,
  RetrievedService,
  Service,
  ServiceMetadata,
  toAuthorizedCIDRs,
  toAuthorizedRecipients
} from "@pagopa/io-functions-commons/dist/src/models/service";

import { MaxAllowedPaymentAmount } from "@pagopa/io-functions-commons/dist/generated/definitions/MaxAllowedPaymentAmount";

import { ServiceScopeEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/ServiceScope";
import * as TE from "fp-ts/lib/TaskEither";
import { aCosmosResourceMetadata } from "../../__mocks__/mocks";
import { GetServiceMetadataHandler } from "../handler";
import { StandardServiceCategoryEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/StandardServiceCategory";

afterEach(() => {
  jest.resetAllMocks();
  jest.restoreAllMocks();
});

const anOrganizationFiscalCode = "01234567890" as OrganizationFiscalCode;
const aServiceMetadata: ServiceMetadata = {
  scope: ServiceScopeEnum.NATIONAL,
  category: StandardServiceCategoryEnum.STANDARD,
  customSpecialFlow: undefined
};
const aLowerCaseServiceId = "mysubscriptionid" as NonEmptyString;
const anUpperCaseServiceId = "MYSUBSCRIPTIONID" as NonEmptyString;
const aService: Service = {
  authorizedCIDRs: toAuthorizedCIDRs([]),
  authorizedRecipients: toAuthorizedRecipients([]),
  departmentName: "MyDeptName" as NonEmptyString,
  isVisible: true,
  maxAllowedPaymentAmount: 0 as MaxAllowedPaymentAmount,
  organizationFiscalCode: anOrganizationFiscalCode,
  organizationName: "MyOrgName" as NonEmptyString,
  requireSecureChannels: false,
  serviceId: anUpperCaseServiceId,
  serviceMetadata: aServiceMetadata,
  serviceName: "MyServiceName" as NonEmptyString
};

const aNewService: NewService = {
  ...aService,
  kind: "INewService"
};

const aRetrievedService: RetrievedService = {
  ...aNewService,
  ...aCosmosResourceMetadata,
  id: "123" as NonEmptyString,
  kind: "IRetrievedService",
  version: 1 as NonNegativeInteger
};

const aSerializedServiceMetadata: ServiceMetadata = {
  ...aServiceMetadata
};

describe("GetServiceMetadataHandler", () => {
  it("should get an existing service metadata with lowercase serviceId", async () => {
    const serviceModelMock = {
      findOneByQuery: jest.fn(() => {
        return TE.of(
          some({ ...aRetrievedService, serviceId: aLowerCaseServiceId })
        );
      })
    };
    const getServiceMetadataHandler = GetServiceMetadataHandler(
      serviceModelMock as any
    );
    const response = await getServiceMetadataHandler(aLowerCaseServiceId);
    expect(serviceModelMock.findOneByQuery).toHaveBeenCalledTimes(1);
    expect(response.kind).toBe("IResponseSuccessJson");
    if (response.kind === "IResponseSuccessJson") {
      expect(response.value).toEqual(aSerializedServiceMetadata);
    }
  });

  it("should get an existing service metadata", async () => {
    const serviceModelMock = {
      findOneByQuery: jest.fn(() => {
        return TE.of(some(aRetrievedService));
      })
    };
    const getServiceMetadataHandler = GetServiceMetadataHandler(
      serviceModelMock as any
    );
    const response = await getServiceMetadataHandler(aLowerCaseServiceId);
    expect(serviceModelMock.findOneByQuery).toHaveBeenCalledTimes(1);
    expect(response.kind).toBe("IResponseSuccessJson");
    if (response.kind === "IResponseSuccessJson") {
      expect(response.value).toEqual(aSerializedServiceMetadata);
    }
  });
  it("should fail on errors during get", async () => {
    const serviceModelMock = {
      findOneByQuery: jest.fn(() => {
        return TE.left(none);
      })
    };
    const getServiceMetadataHandler = GetServiceMetadataHandler(
      serviceModelMock as any
    );
    const response = await getServiceMetadataHandler(aLowerCaseServiceId);
    expect(serviceModelMock.findOneByQuery).toHaveBeenCalledTimes(1);
    expect(response.kind).toBe("IResponseErrorQuery");
  });
  it("should return not found if the service does not exist", async () => {
    const serviceModelMock = {
      findOneByQuery: jest.fn(() => {
        return TE.of(none);
      })
    };
    const getServiceMetadataHandler = GetServiceMetadataHandler(
      serviceModelMock as any
    );
    const response = await getServiceMetadataHandler(aLowerCaseServiceId);
    expect(serviceModelMock.findOneByQuery).toHaveBeenCalledTimes(1);
    expect(response.kind).toBe("IResponseErrorNotFound");
  });

  it("should return not found if the service does not have metadata", async () => {
    const serviceModelMock = {
      findOneByQuery: jest.fn(() => {
        return TE.of(
          some({
            ...aRetrievedService,
            serviceMetadata: undefined
          })
        );
      })
    };
    const getServiceMetadataHandler = GetServiceMetadataHandler(
      serviceModelMock as any
    );
    const response = await getServiceMetadataHandler(aLowerCaseServiceId);
    expect(serviceModelMock.findOneByQuery).toHaveBeenCalledTimes(1);
    expect(response.kind).toBe("IResponseErrorNotFound");
  });
});
