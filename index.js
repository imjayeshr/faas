const aws = require("aws-sdk");
var ddb = new aws.DynamoDB({ apiVersion: "2012-08-10" });
var ses = new aws.SES();
aws.config.update({ region: "us-east-1" });
const { v4: uuidv4 } = require("uuid");

exports.handler = function (event, context, callback) {
  var token = uuidv4();
  var email = event.Records[0].Sns.Message;
  var link = `http://prod.potterheadsbookstore.me/reset?email=${email}&token=${token}`;

  var currentTime = new Date().getTime();
  console.log("Current time is", currentTime);
  var ttl = 15 * 60 * 1000;
  var expirationTime = (Number(currentTime) + ttl);
  expirationTime = Math.floor(expirationTime/1000);
  console.log("Expiration time", expirationTime);

  var emailParams = {
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Body: {
        Text: {
          Charset: "UTF-8",
          Data: link,
        },
        Html: {
          Charset: "UTF-8", 
          Data: "Password Reset. Token:<a class=\"ulink\" href=\"" + link + "\" target=\"_blank\">Link:</a>."
          }
      },
      Subject: {
        Charset: "UTF-8",
        Data: "Reset Password Link",
      },
    },
    Source: "password_reset@prod.potterheadsbookstore.me",
  };

  var getParams = {
    TableName: "csye6225",
    Key: {
      id: { S: email },
    },
  };

  var putParams = {
    TableName: "csye6225",
    Item: {
      id: { S: email },
      ttl: { N: expirationTime.toString() },
      uuid: { S: token },
    },
  };

  ddb.getItem(getParams, (err, data) => {
    if (err) {
      console.log("Error getting the item from Dynamo DB table", err);
      return err;
    }

    console.log(data);
    // Entry is not present
    if (data.Item == undefined) {
      ddb.putItem(putParams, (err, data) => {
        if (err) {
          console.log("Error saving the item to the table", err);
          return err;
        }

        ses
          .sendEmail(emailParams)
          .promise()
          .then(function (data) {
            console.log("Email sent for first time!");
            console.log(data.MessageId);
            return data;
          })
          .catch(function (err) {
            console.error("Error sending the email", err, err.stack);
            return err;
          });
      });
    } else {
      console.log(typeof data.Item);
      console.log(typeof data.Item.ttl.N);
      var t = Number(data.Item.ttl.N);
      console.log("DB time is", t);
      console.log("Current time is", currentTime)
      //console.log("Current time divided by 1000", Math.floor(currentTime/1000));
      if (Math.floor(currentTime/1000) > t) {
        console.log("Past the TTL time. Updating the timestamp");
        ddb.putItem(putParams, (err, data) => {
          console.log("Data putitem::" + data);
          if (err) {
            console.log(err);
          } else {
            console.log(data);
            ses
              .sendEmail(emailParams)
              .promise()
              .then(function (data) {
                console.log(data.MessageId);
              })
              .catch(function (err) {
                console.error(err, err.stack);
              });
          }
        });
      } else {
        console.log("Wait for 15 mins");
      }
    }

    return data;
  });
};