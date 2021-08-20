const AWS = require('aws-sdk');

const moment = require('moment');

const ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

const TABLE_NAME = process.env["TableName"];

exports.handler = async (event, context, callback) => {
    
    if(!event.body){
        console.log('No form data Found');
        callback(null, makeResponse(
                200,
                {message: 'No form data Found'}
            ),
        );
        return;
    }
    
    const body = JSON.parse(event.body);
    
    console.log(body)
    
    const COIN_PAIR = body.coin_pair;
    
    const PRICE = body.price;
    
    const SIDE = body.side;
    
    const SIZE = body.size;
    
    const TYPE = body.type;

    const MODE = body.mode;
    
    
    if(!TYPE && !PRICE){
        console.log("invalid order:",body);
        callback(null, makeResponse(
                400,
                {message: "invalid order"}
            )
        );
        return;
    }
    
    if(COIN_PAIR != 'xrp_jpy'){
        console.log("invalid coin pair");
        callback(null, makeResponse(
                400,
                {message: "invalid order"}
            ),
        );
        return;
    }
    
    if(MODE != 'insert' && MODE != 'delete'){
        console.log("invalid mode:", MODE);
        callback(null, makeResponse(
                400,
                {message: "invalid order"}
            ),
        );
        return;
    }
    
    if(MODE == 'insert'){
        
        const param = {
            
            "coin_pair": COIN_PAIR,
            "price": PRICE.toString(),
            "size": SIZE.toString(),
            "side": SIDE,
            "type": TYPE,
            "ordered_at": moment().valueOf().toString()
        };
    
    
        if(!checkElement(param)){
            console.log("Bad body:", param);
            callback(null, makeResponse(
                    400,
                    {message: "invalid order"}
                )
            );
            return;
         }
        
    
        let data = await scanDynamoDB(param);
                    
        data = data.Items;
            
         
        if(data.find(d => d.coin_pair == COIN_PAIR || d.price == PRICE)){
            console.log('Data Already Exists:', data);
            callback(null, makeResponse(
                    401,
                    {message: 'Data Already Exists:'+ data}
                )
            );
            return;
        }
        
        const params = {
            
            Item: {
                
                'coin_pair' : {S: param.coin_pair},
                'price' : {N: param.price},
                'side': {S: param.side},
                'size': {N: param.size},
                'ordered_at': {S: param.ordered_at}
            },
            TableName: TABLE_NAME
        };
        
        putDataToDynamoDB(params);

        
    }else if(MODE == 'delete'){
        
        const params = {
            TableName: TABLE_NAME,
            Key: {
                    'coin_pair' : {S: COIN_PAIR},
                    'price' : {N: PRICE.toString()}
            }
        };
        
        deleteDataFromDynamoDB(params);
    }else{
        console.log('wrong requestbody');
        callback(null, makeResponse(
                401,
                {message: 'wrong requestbody'}
            ),
        );
        return;
    }

    callback(null, makeResponse(
            200,
            {message: 'Successfuly: ' + MODE}
        ),
    );
    return;
};
    
const checkElement = (element) => {
    if(element.type == 'market' || element.type == 'limit'
    || element.type == 'stop'){
          
        if(element.side != 'buy' && element.side != 'sell'){
            console.log("invalid side");
            return false;
        }
      
      
      
        if(isNaN(element.price) && element.type != 'market'){
            console.log("number invalid:", element.price);
            return false;
        }
        if(isNaN(element.size)){
            console.log("number invalid:", element.size);
            return false;
        }
          
        return true;
    }
    return false;
};

const scanDynamoDB = async () => {
    const params = {
        TableName: TABLE_NAME
    };
    
    // Call DynamoDB to add the item to the table
    return ddb.scan(params).promise();
};

const putDataToDynamoDB = async (params) => {
    
    console.log(params);
    // Call DynamoDB to add the item to the table
    try{
        await ddb.putItem(params).promise();
    }catch(err){
        console.error(err);
    }
};

const deleteDataFromDynamoDB = async (params) => {
        
    try{
        ddb.deleteItem(params).promise();
    }catch(err){
        console.error(err);
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