const AWS = require('aws-sdk');
const axios = require('axios');
const lambda = new AWS.Lambda();

AWS.config.update({region: 'ap-northeast-1'});
const ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

const LAMBDA_NAME = process.env["LambdaName"];
const TABLE_NAME = process.env["TableName"];

exports.handler = async (event, context, callback) => {
    
    const XRP_JPY = process.env['XRP_JPY'];
    let dbData;
    
    const params = {
        ExpressionAttributeValues: {
          ':c': {S: 'xrp_jpy'}
        },
        KeyConditionExpression: 'coin_pair = :c',
        ProjectionExpression: 'coin_pair, price, side, size',
        TableName: TABLE_NAME
    };
    
    let data = await queryDynamoDB(params);
    
    if(data.Items.length == 0){
        console.log("stop check data not set");
        callback(null, {
            statusCode: 200,
            body: JSON.stringify({message: "price check data not set"}),
            headers: {"Content-type": "application/json"}
        });
        return;
    }
  
    dbData = data.Items;
    
    console.log(dbData);
    
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
    
    dbData.forEach(function(item){
      
        if(item.side.S == "buy"){
            if(item.price.N < Number(price_data.asks[0][0])){
                executeOrder(item);
            }
        }else if(item.side.S == "sell"){
            if(item.price.N > Number(price_data.bids[0][0])){
                executeOrder(item);
            }
        }
    });
        
    callback(null, {
        statusCode: 200,
        body: JSON.stringify({message: 'No Order Executed'}),
        headers: {"Content-type": "application/json"}
    });
    return;
    
};
    
const executeOrder = (item) => {
    const param = {
        "coin_pair": item.coin_pair.S,
        "price": item.price.N,
        "size": item.size.N,
        "side": item.side.S,
        "type": "market"
    };
      
    console.log("order will be executed:", param);
                
    const payload = param;
      
    payload = JSON.stringify({body:JSON.stringify(payload)});
    callLambda(LAMBDA_NAME, payload);
    const params = {
        TableName: TABLE_NAME,
        Key: {
                'coin_pair' : {S: param.coin_pair},
                'price' : {N: param.price}
             }
      };
    deleteDataFromDynamoDB(params);
};
    

const queryDynamoDB = async (params) =>{
  
    // Call DynamoDB to add the item to the table
    try{
        return await ddb.query(params).promise();
    }catch(err){
        return err;
    }
};

const deleteDataFromDynamoDB = async (params) => {
        
    try{
        await ddb.deleteItem(params).promise();
    }catch(err){
        console.error(err);
    }
};

const callLambda = async (functionName, payload) => {
    
    const params = {
        FunctionName: functionName,
        InvocationType: "RequestResponse",
        Payload: payload
    };
        
    return lambda.invoke(params).promise();
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