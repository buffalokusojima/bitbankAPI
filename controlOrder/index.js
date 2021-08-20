const crypto = require('crypto');
const request = require('request');

const API_KEY = process.env["BitbankApiKey"];
const SECRET_KEY = process.env["BitbankSecretKey"];

exports.handler = (event, context, callback) => {
    
    const apikey = API_KEY;
    const sercretKey = SECRET_KEY;
    
    const body = JSON.parse(event.body);
    
    if(!body){
        console.log("body empty");
          callback(null, {
              statusCode: 400,
              body: JSON.stringify({message: "body empty"}),
              headers: {"Content-type": "application/json"}
            });
        return;
    }
    
    const COIN_PAIR = body.coin_pair;
    
    const PRICE = body.price;
    
    const SIDE = body.side;
    
    const SIZE = body.size;
    
    const TYPE = body.type;
    
    const PARAMETERS = body.parameters;

    const ORDER_METHOD = body.order_method;
    
    if(!TYPE && !PARAMETERS){
        console.log("invalid order:",body);
          callback(null, {
              statusCode: 400,
              body: JSON.stringify({message: "invalid order"}),
              headers: {"Content-type": "application/json"}
            });
        return;
    }
    
    if(COIN_PAIR != 'xrp_jpy'){
        console.log("invalid coin pair");
          callback(null, {
              statusCode: 400,
              body: JSON.stringify({message: "invalid order"}),
              headers: {"Content-type": "application/json"}
            });
        return;
    }
    
    if(!checkElement(body)){
            console.log("Bad body:", body);
            callback(null, {
              statusCode: 400,
              body: JSON.stringify({message: "invalid order"}),
              headers: {"Content-type": "application/json"}
            });
            return;
    }
    
    let paramBody = {
        pair: body.coin_pair,
        amount: body.size,
        price: body.price,
        side: body.side,
        type: body.type
    };

        
    const timestamp = Date.now().toString();
    const method = 'POST';
    const path = '/v1/user/spot/order';
    
    paramBody = JSON.stringify(paramBody);
    console.log(paramBody);
    const text = timestamp + paramBody;
    const sign = crypto.createHmac('sha256', sercretKey).update(text).digest('hex');
    
    const option = {
      url: 'https://api.bitbank.cc' + path,
      method: method,
      headers: {
        'ACCESS-KEY': apikey,
        'ACCESS-NONCE': timestamp,
        'ACCESS-SIGNATURE': sign,
        'Content-Type': 'application/json'
        },
      body: paramBody
    };
    
    request(option, function(error, response, body){
        
        callback(null, makeResponse(
                200,
                {message: body}
            ),
        );
        return;
    });
    return;
    
};
    
const checkElement = (element) => {
    if(element.type == 'market' || element.type == 'limit'
    || element.type == 'stop'){
            
        if(element.side != 'buy' && element.side != 'sell'){
            console.log("invalid side");
            return false;
        }
        
        
        element.price = Number(element.price);
        element.size = Number(element.size);
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