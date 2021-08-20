const axios = require("axios");
const crypto = require('crypto');

const API_KEY = process.env["BitbankApiKey"];
const SECRET_KEY = process.env["BitbankSecretKey"];

exports.handler = async (event, context, callback) => {
    
    const apikey = API_KEY;
    const sercretKey = SECRET_KEY;
    
    const timestamp = Date.now().toString();
    const method = 'GET';
    const path = '/v1/user/spot/active_orders?pair=xrp_jpy';
    
    const text = timestamp +  path;
    const sign = crypto.createHmac('sha256', sercretKey).update(text).digest('hex');
    
    const option = {
      url: 'https://api.bitbank.cc' + path,
      method: method,
      headers: {
        'ACCESS-KEY': apikey,
        'ACCESS-NONCE': timestamp,
        'ACCESS-SIGNATURE': sign,
        'Content-Type': 'application/json'
        }
    };
        
    let data = await axios(option);
        
    if(data.status != 200){
        console.error("Error:",data.response);
        callback(null, makeResponse(
                data.status,
                {message: data.response}
            )
        );
        return;
    }
    
    data = data.data.data;
    
    console.log(data);
        
        
    if(data.orders.length == 0){
        console.log('No data Found');
        callback(null, makeResponse(
                200,
                {message: 'No data Found'}
            ),
        );
        return;
    }
        
        
    callback(null, makeResponse(
            200,
            {data: data.orders}
        ),
    );
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