import { Handler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Alert } from '../models/Alert';
import mongoose from 'mongoose';

const sns = new AWS.SNS();

interface NotificationData {
  userId: string;
  message: string;
  alertId: string;
  notificationType: 'EMAIL' | 'SMS' | 'PUSH';
  contact: string;
}

export const handler: Handler = async (event: NotificationData) => {
  try {
    // Connect to MongoDB Atlas
    await mongoose.connect(process.env.MONGODB_URI!);

    const { message, contact, notificationType } = event;

    // Send notification using SNS
    const params = {
      Message: message,
      TopicArn: process.env.SNS_TOPIC_ARN,
      MessageAttributes: {
        'notificationType': {
          DataType: 'String',
          StringValue: notificationType
        },
        'contact': {
          DataType: 'String',
          StringValue: contact
        }
      }
    };

    await sns.publish(params).promise();

    // Update alert status in MongoDB
    await Alert.findByIdAndUpdate(event.alertId, {
      status: 'SENT'
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Notification sent successfully'
      })
    };
  } catch (error) {
    console.error('Error sending notification:', error);

    // Update alert status to failed
    await Alert.findByIdAndUpdate(event.alertId, {
      status: 'FAILED'
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error sending notification',
        error: error
      })
    };
  }
};