const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

const TABLE_NAME = process.env["TableName"];

exports.handler = async (event, context, callback) => {
    
    const params = {
        ExpressionAttributeValues: {
          ':c': {S: 'xrp_jpy'}
        },
        KeyConditionExpression: 'coin_pair = :c',
        ProjectionExpression: 'coin_pair, price, side, size, ordered_at',
        TableName: TABLE_NAME
    };
    
    let data = await queryDynamoDB(params);
        
    if(data.Items.length == 0){
      console.log("stop check data not set");
      callback(null, makeResponse(
                200,
                {message: "price check data not set"}
            )
      );
      return;
    }
  
    data = data.Items;
    
    console.log(data);
    
    data.forEach(function(d){
      
      d.coin_pair = d.coin_pair.S;
      d.start_amount = d.size.N;
      d.side = d.side.S;
      d.price = d.price.N;
      d.size = d.size.N;
      d.type = "stop",
      d.ordered_at = Number(d.ordered_at.S);
      d.order_id = "stop_"+d.ordered_at;
    });
    callback(null, makeResponse(
            200,
            {data: data}
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
