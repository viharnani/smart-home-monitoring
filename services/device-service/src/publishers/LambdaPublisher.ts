import AWS from 'aws-sdk';

export class LambdaPublisher {
  private lambda: AWS.Lambda;

  constructor() {
    this.lambda = new AWS.Lambda({
      endpoint: process.env.AWS_LAMBDA_ENDPOINT,
      region: process.env.AWS_REGION || 'us-east-1'
    });
  }

  async publish(data: any): Promise<void> {
    const params = {
      FunctionName: 'processDeviceData',
      InvocationType: 'Event',
      Payload: JSON.stringify(data)
    };

    try {
      await this.lambda.invoke(params).promise();
    } catch (error) {
      console.error('Error publishing to Lambda:', error);
      throw error;
    }
  }
}
