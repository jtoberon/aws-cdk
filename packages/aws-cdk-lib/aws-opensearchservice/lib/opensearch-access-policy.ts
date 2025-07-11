import { Construct } from 'constructs';
import * as iam from '../../aws-iam';
import * as cdk from '../../core';
import * as cr from '../../custom-resources';

/**
 * Construction properties for OpenSearchAccessPolicy
 */
export interface OpenSearchAccessPolicyProps {
  /**
   * The OpenSearch Domain name
   */
  readonly domainName: string;

  /**
   * The OpenSearch Domain ARN
   */
  readonly domainArn: string;

  /**
   * The access policy statements for the OpenSearch cluster
   */
  readonly accessPolicies: iam.PolicyStatement[];

  /**
   * Flag to control verbosity of OpenSearch policy custom resource result
   * If verbose output is actively disabled it will only output specific fields
   * This is can be used to limit the response body of the custom resource, in cases it exceeds the CFN 4k limit
   * @default true
   */
  readonly verboseOutput?: boolean;
}

/**
 * Creates LogGroup resource policies.
 */
export class OpenSearchAccessPolicy extends cr.AwsCustomResource {
  private accessPolicyStatements: iam.PolicyStatement[] = [];

  constructor(scope: Construct, id: string, props: OpenSearchAccessPolicyProps) {
    super(scope, id, {
      resourceType: 'Custom::OpenSearchAccessPolicy',
      installLatestAwsSdk: false,
      onUpdate: {
        action: 'updateDomainConfig',
        service: 'OpenSearch',
        parameters: {
          DomainName: props.domainName,
          AccessPolicies: cdk.Lazy.string({
            produce: () => JSON.stringify(
              new iam.PolicyDocument({
                statements: this.accessPolicyStatements,
              }).toJSON(),
            ),
          }),
        },
        // this is needed to limit the response body, otherwise it exceeds the CFN 4k limit
        // If verbose output is actively disabled it will only output specific fields
        outputPaths: (props.verboseOutput === undefined || props.verboseOutput) ? ['DomainConfig.AccessPolicies'] : ['DomainConfig.AccessPolicies.Status.State', 'DomainConfig.AccessPolicies.Status.UpdateVersion'],
        physicalResourceId: cr.PhysicalResourceId.of(`${props.domainName}AccessPolicy`),
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([new iam.PolicyStatement({ actions: ['es:UpdateDomainConfig'], resources: [props.domainArn] })]),
    });

    this.addAccessPolicies(...props.accessPolicies);
  }

  /**
   * Add policy statements to the domain access policy
   */
  public addAccessPolicies(...accessPolicyStatements: iam.PolicyStatement[]) {
    this.accessPolicyStatements.push(...accessPolicyStatements);
  }
}
