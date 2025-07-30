import json
import os

def lambda_handler(event, context):
    #1 - Log the event
    print('*********** The event is: ***************')
    print(event)

    token  = os.getenv('AUTH_TOKEN', 'abc123')  #Set AUTH_TOKEN value in the lambda environment variable, abc123 is the default value
    print('*********** The token is: ***************')
    print(token)
    #2 - See if the person's token is valid
    if event['authorizationToken'] == token:
        auth = 'Allow'
    else:
        auth = 'Deny'
    print(auth)
    #3 - Construct and return the response
    authResponse = { "context": {"stringKey": "value","numberKey": "1","booleanKey": "true"},"policyDocument": { "Version": "2012-10-17", "Statement": [{"Action": "execute-api:Invoke", "Resource": ["*"], "Effect": auth}] }}
    return authResponse