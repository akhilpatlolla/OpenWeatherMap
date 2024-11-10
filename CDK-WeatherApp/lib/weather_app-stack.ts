import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as fs from "fs";

export class WeatherAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const configFilePath = path.join(__dirname, "config.json");
    const configData = JSON.parse(fs.readFileSync(configFilePath, "utf8"));
    const openWeatherParameter = new ssm.StringParameter(this, "openWeatherParameter", {
      parameterName: "/openweather/config",
      stringValue: JSON.stringify(configData),
    });

    const openWeatherBucket = s3.Bucket.fromBucketName(
      this,
      "openWeatherBucket",
      configData["bucket_name"] // "riding-videos-tony"
    );

    //Python AWS Lambda Layer
    const aws_lambda_layer = new lambda.LayerVersion(
      this,
      "aws-cli-bash-python",
      {
        layerVersionName: "aws-cli-bash-python",
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        code: lambda.Code.fromAsset(
          path.join(__dirname, "layers/awscli-lambda-layer.zip")
        ),
        compatibleRuntimes: [
          lambda.Runtime.PYTHON_3_10,
          lambda.Runtime.PYTHON_3_11,
          lambda.Runtime.PYTHON_3_12,
        ],
      }
    );
    //Python pandas Lambda Layer
    // get layer from arn
    const pandas_layer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      "pandas-layer",
      "arn:aws:lambda:us-west-2:336392948345:layer:AWSSDKPandas-Python310:21"
    );

    //Python matplotlib Lambda Layer
    const matplotlib_layer = new lambda.LayerVersion(this, "matplotlib-layer", {
      layerVersionName: "matplotlib-layer",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      code: lambda.Code.fromAsset(
        path.join(__dirname, "layers/matplotlib-lambda-layer.zip")
      ),
      compatibleRuntimes: [
        lambda.Runtime.PYTHON_3_10,
        lambda.Runtime.PYTHON_3_11,
        lambda.Runtime.PYTHON_3_12,
      ],
    });
    // //Python requests Lambda Layer
    // const requests_layer = new lambda.LayerVersion(this, "requests-layer", {
    //   layerVersionName: "requests-layer",
    //   removalPolicy: cdk.RemovalPolicy.DESTROY,
    //   code: lambda.Code.fromAsset(
    //     path.join(__dirname, "layers/requests-lambda-layer.zip")
    //   ),
    //   compatibleRuntimes: [
    //     lambda.Runtime.PYTHON_3_10,
    //     lambda.Runtime.PYTHON_3_11,
    //     lambda.Runtime.PYTHON_3_12,
    //   ],
    // });
    //Python bokeh Lambda Layer
    // const bokeh_layer = new lambda.LayerVersion(this, "bokeh-layer", {
    //   layerVersionName: "bokeh-layer",
    //   removalPolicy: cdk.RemovalPolicy.DESTROY,
    //   code: lambda.Code.fromAsset(
    //     path.join(__dirname, "layers/bokeh-lambda-layer.zip")
    //   ),
    //   compatibleRuntimes: [
    //     lambda.Runtime.PYTHON_3_10,
    //     lambda.Runtime.PYTHON_3_11,
    //     lambda.Runtime.PYTHON_3_12,
    //   ],
    // });
    // const pandas_layer =
    // new lambda.LayerVersion(this, "pandas-layer", {
    //   layerVersionName: "pandas-layer",
    //   removalPolicy: cdk.RemovalPolicy.DESTROY,
    //   code: lambda.Code.fromAsset(
    //     path.join(__dirname, "layers/pandas-lambda-layer.zip")
    //   ),
    //   compatibleRuntimes: [
    //     lambda.Runtime.PYTHON_3_10,
    //     lambda.Runtime.PYTHON_3_11,
    //     lambda.Runtime.PYTHON_3_12,
    //   ],
    // });

    //lambda

    const lambda_role = new iam.Role(this, `lambda-service-role`, {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal(
          `lambda.${cdk.Stack.of(this).region}.amazonaws.com`
        )
      ),
      roleName: `lambda-service-role`,
      inlinePolicies: {
        ["lambdaservicerolepolicy"]: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ["s3:*"],
              effect: iam.Effect.ALLOW,
              resources: [
                openWeatherBucket.bucketArn,
                `${openWeatherBucket.bucketArn}/*`,
              ],
            }),
            new iam.PolicyStatement({
              actions: ["logs:*"],
              effect: iam.Effect.ALLOW,
              resources: [
                `arn:aws:logs:${cdk.Stack.of(this).region}:${
                  cdk.Stack.of(this).account
                }:*`,
              ],
            }),
            new iam.PolicyStatement({
              actions: ["cloudwatch:*"],
              effect: iam.Effect.ALLOW,
              resources: [
                `arn:aws:cloudwatch:${cdk.Stack.of(this).region}:${
                  cdk.Stack.of(this).account
                }:*`,
              ],
            }),
            new iam.PolicyStatement({
              actions: ["ses:*"],
              effect: iam.Effect.ALLOW,
              resources: ["*"],
            }),
            new iam.PolicyStatement({
              actions: ["ses:*"],
              effect: iam.Effect.ALLOW,
              resources: [openWeatherParameter.parameterArn],
            }),
          ],
        }),
      },
    });

    lambda_role.addManagedPolicy(
      iam.ManagedPolicy.fromManagedPolicyArn(
        this,
        `lambda-basic-role-policy`,
        "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
      )
    );

    const openWeatherLambda = new lambda.Function(this, "WeatherForecase", {
      runtime: lambda.Runtime.PYTHON_3_10,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "lambda")),
      layers: [
        // matplotlib_layer,
        pandas_layer,
      ],
      role: lambda_role,
      environment: {
        lat: configData["latitude"],
        lon: configData["longtitude"],
      },
      timeout: cdk.Duration.minutes(5),
    });

    const rule = new cdk.aws_events.Rule(this, "Rule", {
      schedule: cdk.aws_events.Schedule.cron({
        minute: "0",
        hour: "0",
      }),
      enabled: true,
    });

    rule.addTarget(
      new cdk.aws_events_targets.LambdaFunction(openWeatherLambda)
    );
  }
}
