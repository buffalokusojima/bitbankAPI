const request = require('request');
const crypto = require('crypto');

const API_KEY = process.env["BitbankApiKey"];
const SECRET_KEY = process.env["BitbankSecretKey"];

exports.handler = (event, context, callback) => {

    const body = JSON.parse(event.body);
   
    console.log(body);
    
    if(!body.order_id || !body.coin_pair){
        console.log("body empty");
        callback(null, makeResponse(
                400,
                {message: "body empty"}
            ),
        );
        return;
    }
    
    const paramBody = JSON.stringify({
            pair: body.coin_pair,
            order_id: body.order_id
    });
        
    const apikey = API_KEY;
    const sercretKey = SECRET_KEY;
    
    const timestamp = Date.now().toString();
    const method = 'POST';
    const path = '/v1/user/spot/cancel_order';
    
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