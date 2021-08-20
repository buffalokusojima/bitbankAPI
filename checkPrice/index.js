const AWS = require('aws-sdk');
const axios = require('axios');
const querystring = require('querystring');
const momentTimezone = require('moment-timezone');

AWS.config.update({region: 'ap-northeast-1'});
const ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

const TABLE_NAME = process.env["TableName"];
const LINE_KEY = process.env["LINEApiKey"];

exports.handler = async (event, context, callback) => {
    
    const XRP_JPY = process.env['XRP_JPY'];

    console.log(XRP_JPY);
    
    const params = {
        ExpressionAttributeValues: {
          ':c': {S: 'xrp_jpy'}
        },
        KeyConditionExpression: 'coin_pair = :c',
        ProjectionExpression: 'coin_pair, price, side',
        TableName: TABLE_NAME
    };
    let data = await queryDynamoDB(params);
        
    if(data.Items.length == 0){
      console.log("price check data not set");
      callback(null, {
          statusCode: 200,
          body: JSON.stringify({message: "price check data not set"}),
          headers: {"Content-type": "application/json"}
        });
      return;
    }
  
    const price_alert_data = data.Items;
    
    const method = "GET";
    
    const path = "/xrp_jpy/depth";
    
    const option = {
        url: 'https://public.bitbank.cc' + path,
        method: method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
        
    data = await axios(option);
    
    if(data.status != 200){
        console.error("Error:",data.response);
        callback(null, makeResponse(
                data.status,
                {message: data.response}
            )
        );
        return;
    }
        
    let price_data = data.data.data;
    console.log(price_data);
    
    if(price_data == null){
        console.log("price data not Found");
        callback(null, makeResponse(
                403,
                {message: 'No Data Found'}
            ),
        );
        return;
    }
    
    if(typeof XRP_JPY == 'undefined'){
        process.env['XRP_JPY'] = price_data.asks[0][0];
        console.log("Lambda Restarted");
        callback(null, makeResponse(
                200,
                {message: "Lambda Restarted"}
            ),
        );
        return;
    }
          
    let message;
    for(const value of price_alert_data){
        console.log(value);
        if(value.side.S == 'up' && 
            Number(value.price.N) > XRP_JPY && Number(value.price.N) < Number(price_data.asks[0][0])){
            console.log("["+value.coin_pair.S+"] " + value.price.N + "over");
             
            message = '\n';
  
            const dateTimeJst = momentTimezone(new Date()).tz('Asia/Tokyo').format('YYYY/MM/DD HH:mm:ss');
              
            message += "Price Alart for XRP" + value.side.S + "\n" 
                    + "price " + value.price.N + "\n"
                    + dateTimeJst;
            process.env['XRP_JPY'] = price_data.asks[0][0];
            console.log(message);
            sendLine(message, callback);
            return;
      }else if(value.side.S == 'down' && 
            Number(value.price.N) < XRP_JPY && Number(value.price.N) > Number(price_data.asks[0][0].price)){
            console.log("["+value.coin_pair.S+"] " + value.price.N + "below");
              
            message = '\n';

            const dateTimeJst = momentTimezone(new Date()).tz('Asia/Tokyo').format('YYYY/MM/DD HH:mm:ss');
              
            message += "Price Alart for XRP" + value.side.S + "\n" 
                    + "price " + value.price.N + "\n"
                    + dateTimeJst;
            process.env['XRP_JPY'] = price_data.asks[0][0];
            console.log(message);
            sendLine(message, callback);
            return;
        }
    }
    process.env['XRP_JPY'] = price_data.asks[0][0];
    console.log("No Alert");
    callback(null,makeResponse(
            200,
            {message: "No Alert"}
        ),
    );
    return;
};
      
const queryDynamoDB = async (params) =>{
  
    // Call DynamoDB to add the item to the table
    try{
        return await ddb.query(params).promise();
    }catch(err){
        return err;
    }
};
      
const sendLine = async (message) => {
    console.log(message);
    
    const option = {
        url: 'https://notify-api.line.me/api/notify',
        method: 'POST',
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            'Authorization': 'Bearer ' + LINE_KEY
        },
        data: querystring.stringify(
            {
                message: message
            }
        )
    };

    try { 
        const response = await axios(option);
        console.log(response.data);
        
    } catch (error) { 
        console.error(error);
    }
};

const makeResponse = (statusCode, body) => {
    return {
        statusCode: statusCode,
        body: JSON.stringify(body),
        headers: {
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS"
        }
    };
};