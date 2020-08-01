## Faas
## Assignment 10
# Creating Lmabda Function
 Implementing Lambda Function for Password Reset for a User.
 Each user will have only one password reset token active in database(Dynamo DB) at a time.
 The TTL for the token will be 15 mins.
 Sending password reset link via email using SES and SNS services.
