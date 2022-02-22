const axios = require('axios');
const querystring = require('querystring');
const crypto = require('crypto');
const moment = require('moment');
const momentTimezone = require('moment-timezone');

const API_KEY = process.env["BitbankApiKey"];
const SECRET_KEY = process.env["BitbankSecretKey"]

const LINE_KEY = process.env["LINEApiKey"];

exports.handler = async (event, context, callback) => {
    
    const since = process.env['since'];
    console.log('since: ' + since);
    
   
       
    const apikey = API_KEY;
    const sercretKey = SECRET_KEY;
    
    const timestamp = Date.now().toString();
    const method = 'GET';
    let path = '/v1/user/spot/trade_history?pair=xrp_jpy';
    
    const sinceText = '&since=';
    
    if(since){
        path += sinceText + since;
    }
    
    const text = timestamp + path;
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
    
    let data;
    try { 
        const response = await axios(option);
        data = response.data;
    } catch (error) { 
        console.error(error.response.body); 
        callback(null, makeResponse(
            data.response.statusCode,
            {message: data.response}
            ),
        );
        return;
    }
    
    data = data.data;
    
    if(data.length == 0){
        console.log('No data Found');
        callback(null, makeResponse(
                200,
                {message: 'No data Found'}
            ),
        );
        return;
    }
    
    console.log(data);

    data = data.trades;
    
    let date = data[0].executed_at;
    
    if(since == null){
        console.log('Lambda Restarted');
    }
        
    process.env['since'] = date;
    
    let message = '';
    const toDay = new Date(momentTimezone(new Date()).tz('Asia/Tokyo').format('YYYY/MM/DD HH:mm:ss'));
    
    for(let i=0; i<data.length; i++){   
        const value = data[i];
        
        date = value.executed_at;
        
        if(toDay.getTime() - date > 32450000){
            data = data.slice(0,i);
            break;
        }
        
        date = moment(new Date(value.executed_at));
        date = date.format("YYYY/MM/DD HH:mm:ss");
        message += value.pair + " contract done\n" 
                +  "[" + value.side + ": " + value.type + "]\n"
                + "Date " + date + "\n"
                + "price " + value.price + "\n"
                + "size: " + value.amount + "\n"
                + "----------------------\n";
                
    }
    
    if(message == ""){
        console.log('No data Found');
        callback(null,makeResponse(
            200,
            {message: 'No data Found'}
            )
        );
        return;
    }
    
    message = '\n' + message;
    sendLine(message,callback);
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