import json
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('koreCcSessions')  # Ensure the table name matches your DynamoDB setup

def lambda_handler(event, context):
    # Assume Amazon Connect provides a primary key via Lambda input
    print('$$$$$$$$$$$$$$$$$$$$$$ Entered into retrieve session details lambda $$$$$$$$$$$$$$$$$$$$')
    
    print(json.dumps(event))
    contactId = event['Details']['Parameters']['contactId']

    print('contactId from contact flow',contactId)
    
    # Retrieve the data from DynamoDB
    response = table.get_item(
        Key={
            'contactId': contactId
        }
    )

    print("response", response)
    
    # Return the data in the format Amazon Connect expects
    if 'Item' in response:
        key = {
            'statusCode': 200,
            'body': json.dumps(response['Item']['kore_session_data'])
        }
        return key
    else:
        return {
            'statusCode': 404,
            'body': json.dumps('Data not found')
        }
