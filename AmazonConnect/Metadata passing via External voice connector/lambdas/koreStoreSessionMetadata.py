# This Lambda function saves session metadata passed from an external voice connector to DynamoDB.
# It expects the contactId to be passed as a query parameter and the session data in the body of the request.
# The function stores this data in a DynamoDB table named 'koreCcSessions'.

import json
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('koreCcSessions') # Ensure the table name matches your DynamoDB setup

def lambda_handler(event, context):
    # Assume the third-party instance sends data in JSON format
    print('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@Entered into the lambda for koreStoreSessionMetadata@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@')
    print('event', event);
    query_params = event.get('queryStringParameters')

    print('query_params', query_params)
    contactId=''
    if query_params:
        # Example: Access specific query parameters
        contactId = query_params.get('contactId')
    
    try:
        # Attempt to parse the input as JSON
        data = json.loads(event.get('body'))
    except (ValueError, TypeError):
        # If it's not JSON, return the input as is
        data = event.get('body', {})
    
    # Extract data from the incoming request
    print('contactId', contactId, type(contactId))
    print('data', data, type(data))
    # Store the data in DynamoDB
    table.put_item(
        Item={
            'contactId': contactId,
            'kore_session_data':data
        }
    )
    
    return {
        'statusCode': 200,
        'body': json.dumps('Data stored successfully')
    }
