
Public
ENVIRONMENT
No Environment
LAYOUT
Single Column
LANGUAGE
cURL - cURL
Delybell External Api's
Introduction
POST
calculate shipping charge
POST
create order
GET
list blocks
GET
list roads
GET
list buildings
GET
list service types
GET
print order sticker
GET
track order
Delybell External Api's
POST
calculate shipping charge
{{URL}}/v1/customer/external/order/shipping_charge
API Endpoint: Calculate Shipping Charge for Order
This endpoint is used to calculate the shipping charge for a order based on the provided order details. It allows users to specify various parameters related to the order and its associated packages, enabling accurate shipping cost estimation.

Request Format
HTTP Method: POST
Endpoint: {{URL}}/v1/customer/external/order/shipping_charge

Authentication:

This endpoint requires authentication. Ensure that your request includes the appropriate authentication tokens in the headers.
Headers:

Content-Type: Must be set to application/json to indicate that the request body is in JSON format.
Request Body
The request body must be in JSON format and should include the following parameters:

order_type (integer): Represents the type of order being processed.

service_type_id (integer): The ID representing the type of service for shipping.

package_details (array of objects): An array containing details about the packages. Each package object should include:

weight (integer): The weight of the package.
destination_block_id (integer): The ID representing the destination block for the shipping.

Example Request Body:

json
{
  "order_type": 1,
  "service_type_id": 3,
  "package_details": [
    {
      "weight": 8
    }
  ],
  "destination_block_id": 2
}
Expected Response Format
The response will typically include the calculated shipping charge based on the provided order and package details. The exact structure of the response may vary, but it will generally contain the following:

status (boolean): Indicates whether the request was successful.

message (string): A message providing additional information about the request status.

data (object): Contains the calculated shipping charge for the draft order, specifically:

shippingCharge (float): The calculated shipping charge.
Example Response:

json
{
  "status": true,
  "message": "",
  "data": {
    "shippingCharge": 0
  }
}
Make sure to handle any errors appropriately, as the response may also include error messages if the request is invalid or if there are issues with the provided data.

HEADERS
x-access-key
{{x-access-key}}

x-secret-key
{{x-secret-key}}

Body
raw (json)
json
{
    "order_type": 1, // Domestic = 1, International = 2, currently only support Domestic
    "service_type_id": 1, // Provided List of services api
    "destination_block_id": 2, // Provided, List of block id api
    "package_details": [
        {
            "weight": 8 // in kg
        }
    ]
}
Example Request
calculate shipping charge
View More
curl
curl --location -g '{{URL}}/v1/customer/external/order/shipping_charge' \
--header 'x-access-key: b588fdce1077cd45309a91e6fdf7296ff4c92e039c3281569e75d6faf828809b' \
--header 'x-secret-key: 66ac692d64ccf7919e8a720391f5212373d4dc93f155dc3264c28016196ebd6b' \
--data '{
    "order_type": 1, // Domestic = 1, International = 2, currently only support Domestic
    "service_type_id": 3, // Provided List of services api
    "destination_block_id": 2, // Provided, List of block id api
    "package_details": [
        {
            "weight": 8 // in kg
        }
    ]
}'
201 Created
Example Response
Body
Headers (6)
json
{
  "status": true,
  "message": "Calculated shipping charge successfully",
  "data": {
    "shippingCharge": 8
  }
}
POST
create order
{{URL}}/v1/customer/external/order/create
Create External Order
This endpoint allows you to create an external order for a customer. It accepts various parameters related to the order details, pickup and destination information, and package specifications.

Request Parameters
The request must be sent as a JSON object with the following parameters:

order_type (integer): Specifies the type of order.

service_type_id (integer): Identifies the service type for the order.

customer_input_order_id (string): A unique identifier for the order provided by the customer.

pickup_customer_name (string): The name of the customer at the pickup location.

pickup_mobile_number (string): The mobile number of the customer at the pickup location.

pickup_block_id (integer): The block ID for the pickup address.

pickup_road_id (integer): The road ID for the pickup address.

pickup_building_id (integer): The building ID for the pickup address.

destination_customer_name (string): The name of the customer at the destination location.

destination_mobile_number (string): The mobile number of the customer at the destination location.

destination_alternate_number (string): An alternate mobile number for the destination customer.

destination_block_id (integer): The block ID for the destination address.

destination_road_id (integer): The road ID for the destination address.

destination_building_id (integer): The building ID for the destination address.

destination_flat_or_office_number (string): The flat or office number at the destination.

delivery_instructions (string): Special instructions for the delivery.

pickup_preference_date (string, date format): The preferred date for pickup.

pickup_preference_slot_type (integer): The type of time slot for the pickup.

is_cod (boolean): Indicates if the order is Cash on Delivery.

cod_amount (integer): The amount for Cash on Delivery, if applicable.

package_details (array): An array of package details, where each package includes:

weight (integer): The weight of the package.

package_description (string): A description of the package.

customer_input_package_value (integer): The value of the package as input by the customer.

Expected Response
On a successful request, the response will be a JSON object containing:

status (boolean): Indicates the success or failure of the request.

message (string): A message providing additional information about the request status.

data (object): Contains the order details:

orderId (string): The unique identifier for the created order.

shippingCharge (integer): The shipping charge for the order.

orderPackages (array): An array of package details associated with the order, where each package includes:

orderPackageId (string): The unique identifier for the package.

weight (integer): The weight of the package.

packageDescription (string): A description of the package.

customerInputPackageValue (integer): The value of the package as input by the customer.

qrCode (string): A QR code associated with the package.

Notes
Ensure that all required fields are provided in the request to avoid errors.

The pickup_preference_date should be in the correct date format.

If is_cod is set to true, the cod_amount must be specified.

This endpoint allows you to create an external order for a customer. It is designed to facilitate the ordering process by accepting various parameters related to the order details, pickup and destination information, and package specifications.

Request Method
POST
Endpoint
{{URL}}/v1/customer/external/order/create
Request Parameters
The request must be sent as a JSON object with the following parameters:

order_type (integer): Specifies the type of order.

service_type_id (integer): Identifies the service type for the order.

customer_input_order_id (string): A unique identifier for the order provided by the customer.

pickup_customer_name (string): The name of the customer at the pickup location.

pickup_mobile_number (string): The mobile number of the customer at the pickup location.

pickup_block_id (integer): The block ID for the pickup address.

pickup_road_id (integer): The road ID for the pickup address.

pickup_building_id (integer): The building ID for the pickup address.

destination_customer_name (string): The name of the customer at the destination location.

destination_mobile_number (string): The mobile number of the customer at the destination location.

destination_alternate_number (string): An alternate mobile number for the destination customer.

destination_block_id (integer): The block ID for the destination address.

destination_road_id (integer): The road ID for the destination address.

destination_building_id (integer): The building ID for the destination address.

destination_flat_or_office_number (string): The flat or office number at the destination.

delivery_instructions (string): Special instructions for the delivery.

pickup_preference_date (string, date format): The preferred date for pickup.

pickup_preference_slot_type (integer): The type of time slot for the pickup.

is_cod (boolean): Indicates if the order is Cash on Delivery.

cod_amount (integer): The amount for Cash on Delivery, if applicable.

package_details (array): An array of package details, where each package includes:

weight (integer): The weight of the package.

package_description (string): A description of the package.

customer_input_package_value (integer): The value of the package as input by the customer.

Expected Response
On a successful request, the response will be a JSON object containing:

status (boolean): Indicates the success or failure of the request.

message (string): A message providing additional information about the request status.

data (object): Contains the order details:

orderId (string): The unique identifier for the created order.

shippingCharge (integer): The shipping charge for the order.

orderPackages (array): An array of package details associated with the order, where each package includes:

orderPackageId (string): The unique identifier for the package.

weight (integer): The weight of the package.

packageDescription (string): A description of the package.

customerInputPackageValue (integer): The value of the package as input by the customer.

qrCode (string): A QR code associated with the package.

Notes
Ensure that all required fields are provided in the request to avoid errors.

The pickup_preference_date should be in the correct date format.

If is_cod is set to true, the cod_amount must be specified.

HEADERS
x-access-key
{{x-access-key}}

x-secret-key
{{x-secret-key}}

Body
raw (json)
View More
json
{
    //mandatory
    "order_type": 1, // Domestic = 1, International = 2, currently only support Domestic
    "service_type_id": 1, // Provided List of services api
    "customer_input_order_id": "SM123456789BH", // This is the order id reference by the company //mandatory, provided by SMI (tracking no.)

    // optional
    "pickup_customer_name": "Sam", // This is optional, if ignore it will take company name
    "pickup_mobile_number": "+9164585425", // This is optional, if ignore it will take company mobile number
    "pickup_block_id": 1, // This is optional, if ignore it will take company block id
    "pickup_road_id": 1, // This is optional, if ignore it will take company road id
    "pickup_building_id": 1, // This is optional, if ignore it will take company building id
    
    // optional
    "sender_address": "James, street-1, main road, manama", // optional

    //mandatory
    "destination_customer_name": "Dave", //mandatory
    "destination_mobile_number": "+9164525845", //mandatory
    "destination_address": "Building 50, Road 1901, Block 319", //mandatory

    //optional
    "destination_alternate_number": "+9164254224", // This is optional //static (hardcode)
    "destination_block_id": 1, // This is optional, Provided List of block id api //to be optional (hardcode)
    "destination_road_id": 1, // This is optional, Provided List of road id api
    "destination_building_id": 1, // This is optional, Provided List of building id api
    "destination_flat_or_office_number": "mg cottage, B2", // This is optional

    //mandatory
    "delivery_instructions": "Handle with care",
    
    //optional
    "pickup_preference_date": "2025-07-25", // This is optional, only accept today or upcoming days
    "pickup_preference_slot_type": 1, // This is optional, only accept Morning = 1, Afternoon = 2, Night = 3
    "is_cod": false, // Optional, Only for COD enabled Corporate customer
    "cod_amount": 250, // Optional, Only for COD enabled Corporate customer

    //mandatory
    "package_details": [ // you can create 'x' number of packages
        {
            "weight": 2, // in kg
            "package_description": "mobile", //description
            "customer_input_package_value": 600 //item value
        },
        {
            "weight": 12, // in kg
            "package_description": "printer",
            "customer_input_package_value": 300
        }
    ]
}
Example Request
create order
View More
curl
curl --location -g '{{URL}}/v1/customer/external/order/create' \
--header 'x-access-key: {{x-access-key}}' \
--header 'x-secret-key: {{x-secret-key}}' \
--data '{
    //mandatory
    "order_type": 1, // Domestic = 1, International = 2, currently only support Domestic
    "service_type_id": 1, // Provided List of services api
    "customer_input_order_id": "SM123456789BH", // This is the order id reference by the company //mandatory, provided by SMI (tracking no.)

    // optional
    "pickup_customer_name": "Sam", // This is optional, if ignore it will take company name
    "pickup_mobile_number": "+9164585425", // This is optional, if ignore it will take company mobile number
    "pickup_block_id": 1, // This is optional, if ignore it will take company block id
    "pickup_road_id": 1, // This is optional, if ignore it will take company road id
    "pickup_building_id": 1, // This is optional, if ignore it will take company building id
    
    // optional
    "sender_address": "James, street-1, main road, manama", // optional

    //mandatory
    "destination_customer_name": "Dave", //mandatory
    "destination_mobile_number": "+9164525845", //mandatory
    "destination_address": "Building 50, Road 1901, Block 319", //mandatory

    //optional
    "destination_alternate_number": "+9164254224", // This is optional //static (hardcode)
    "destination_block_id": 1, // This is optional, Provided List of block id api //to be optional (hardcode)
    "destination_road_id": 1, // This is optional, Provided List of road id api
    "destination_building_id": 1, // This is optional, Provided List of building id api
    "destination_flat_or_office_number": "mg cottage, B2", // This is optional

    //mandatory
    "delivery_instructions": "Handle with care",
    
    //optional
    "pickup_preference_date": "2025-07-25", // This is optional, only accept today or upcoming days
    "pickup_preference_slot_type": 1, // This is optional, only accept Morning = 1, Afternoon = 2, Night = 3
    "is_cod": false, // Optional, Only for COD enabled Corporate customer
    "cod_amount": 250, // Optional, Only for COD enabled Corporate customer

    //mandatory
    "package_details": [ // you can create '\''x'\'' number of packages
        {
            "weight": 2, // in kg
            "package_description": "mobile", //description
            "customer_input_package_value": 600 //item value
        },
        {
            "weight": 12, // in kg
            "package_description": "printer",
            "customer_input_package_value": 300
        }
    ]
}'
201 Created
Example Response
Body
Headers (6)
View More
json
{
  "status": true,
  "message": "Order created successfully",
  "data": {
    "orderId": "01151930000122",
    "shippingCharge": 5.7,
    "orderPackages": [
      {
        "orderPackageId": "ZZZ19300122",
        "weight": 2,
        "packageDescription": "mobile",
        "customerInputPackageValue": 600,
        "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHQAAAB0CAYAAABUmhYnAAAAAklEQVR4AewaftIAAAKmSURBVO3BQW7sWAwEwSxC979yjpdcPUCQusfmZ0T8wRqjWKMUa5RijVKsUYo1SrFGKdYoxRqlWKMUa5RijVKsUYo1SrFGKdYoFw8l4ZtUTpLQqTyRhG9SeaJYoxRrlGKNcvEylTcl4Q6VkyScqJyovCkJbyrWKMUapVijXHxYEu5QuSMJnUqXhE9Kwh0qn1SsUYo1SrFGufjHqExWrFGKNUqxRrkYJgmdSpeEE5W/rFijFGuUYo1y8WEqv4lKl4QnVH6TYo1SrFGKNcrFy5Lwf1LpktCpPJGE36xYoxRrlGKNcvGQym+ShE6lS8IdKn9JsUYp1ijFGuXioSR0Kl0S3qTSqXRJ6JLQqXRJOEnCm1Q+qVijFGuUYo1y8bIkdCqflIRO5U0qXRI6lSeS0Kk8UaxRijVKsUa5eEjlJAmfpHJHEjqVO1S6JHQqXRI6lU8q1ijFGqVYo8QfPJCETuWbktCpdEnoVJ5Iwh0q31SsUYo1SrFGuXhIpUtCp9IloVM5SUKn0ql0SehUuiR0Kk+onCThROVNxRqlWKMUa5T4gz8sCScqXRKeUDlJwolKl4RO5YlijVKsUYo1SvzBA0n4JpWTJJyodEnoVLoknKicJOEOlSeKNUqxRinWKBcvU3lTEk6S0KmcJOEkCd+k8qZijVKsUYo1ysWHJeEOlU9S6ZLQqZwk4QmVTyrWKMUapVijXAyThBOVb1L5pmKNUqxRijXKxTAqXRK6JHQqXRI6lU7ljiR0Kp9UrFGKNUqxRrn4MJVPUrlD5UTlJAmdyhNJ6FSeKNYoxRqlWKNcvCwJ35SEO5LQqXRJ6FTuSEKncqLypmKNUqxRijVK/MEao1ijFGuUYo1SrFGKNUqxRinWKMUapVijFGuUYo1SrFGKNUqxRinWKP8BcmoN3IJQUSoAAAAASUVORK5CYII="
      },
      {
        "orderPackageId": "ZZZ19300223",
        "weight": 12,
        "packageDescription": "printer",
        "customerInputPackageValue": 300,
        "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHQAAAB0CAYAAABUmhYnAAAAAklEQVR4AewaftIAAALdSURBVO3BQW7oSA4FwXyE7n/lHC+5KkCQ5PlmMyL+YI1RrFGKNUqxRinWKMUapVijFGuUYo1SrFGKNUqxRinWKMUapVijFGuUi4eS8JtU7khCp9IloVPpkvCbVJ4o1ijFGqVYo1y8TOVNSThJQqfSqZyo3KHypiS8qVijFGuUYo1y8bEk3KFyh8pJEjqVLgmdyh1JuEPlS8UapVijFGuUi/84lUmKNUqxRinWKBd/XBI6lU6lS8KJyl9WrFGKNUqxRrn4mMqXVJ5QeULlX1KsUYo1SrFGuXhZEn5TEjqVLgmdSpeETuUkCf+yYo1SrFGKNUr8wSBJOFGZrFijFGuUYo1y8VASOpUuCZ1Kl4ROpUtCp3KickcSOpU7ktCpnCShU3lTsUYp1ijFGiX+4ENJuEPlJAl3qHRJ6FS6JHQqXRK+pPJEsUYp1ijFGuXioSS8KQn/TypdEk5UTpLQqXypWKMUa5RijRJ/8KEknKh0SehUuiScqHRJeEKlS8KJSpeEE5U3FWuUYo1SrFEuHkrCE0k4SUKn0iXhRKVLQqdykoROpUvCE0noVJ4o1ijFGqVYo1w8pPIvS0Kn8kQS7lDpkvClYo1SrFGKNcrFQ0n4TSqdSpeETuUkCZ1Kp3KShJMknKi8qVijFGuUYo1y8TKVNyXhDpUuCZ1Kp3KShBOVLgmdym8q1ijFGqVYo1x8LAl3qNyRhCeS0KmcqHRJ6FS6JHQqXRI6lSeKNUqxRinWKBd/nEqXhE6lS0Kn0iWhU+mS0Kl0SThJQqfypmKNUqxRijXKxR+XhJMkPJGEkyR0Kl0SOpUuCZ3KE8UapVijFGuUi4+pfEnljiR0SThR6ZLQqXRJ6FS6JHypWKMUa5RijXLxsiT8piScqJyodEnoktCpdEm4Q6VLwpuKNUqxRinWKPEHa4xijVKsUYo1SrFGKdYoxRqlWKMUa5RijVKsUYo1SrFGKdYoxRqlWKP8D0eGKP1s9c2uAAAAAElFTkSuQmCC"
      }
    ]
  }
}
GET
list blocks
{{URL}}/v1/customer/external/master/blocks?search=BLK
Retrieve Customer Master Blocks
This endpoint allows you to retrieve the master blocks associated with external customers. It is useful for obtaining block information that can be utilized in various customer-related operations.

Purpose
The primary purpose of this request is to fetch a list of master blocks that can be used in customer management processes. This can assist in identifying and managing various blocks linked to external customer accounts.

Request Format
This is a GET request, and it does not require any additional parameters in the request body. You can include a query parameter for searching specific blocks:

search (string, optional): A query string to filter the blocks based on the specified search term.
The request is sent to the specified URL to fetch the relevant data.

Expected Response
On a successful request, the response will be a JSON object containing:

status (boolean): Indicates the success or failure of the request.

message (string): A message providing additional information about the request status.

data (array): Contains a list of master blocks, where each block includes:

id (integer): The unique identifier for the block.

name (string): The name of the block.

Notes
Ensure that the request is sent to the correct endpoint to retrieve the desired information.

The response will provide a structured list of blocks that can be utilized for further processing or display.

HEADERS
x-access-key
{{x-access-key}}

x-secret-key
{{x-secret-key}}

PARAMS
search
BLK

optional

Example Request
list blocks
curl
curl --location -g '{{URL}}/v1/customer/external/master/blocks?search=BLK' \
--header 'x-access-key: b588fdce1077cd45309a91e6fdf7296ff4c92e039c3281569e75d6faf828809b' \
--header 'x-secret-key: 66ac692d64ccf7919e8a720391f5212373d4dc93f155dc3264c28016196ebd6b'
200 OK
Example Response
Body
Headers (6)
json
{
  "status": true,
  "message": "Blocks list",
  "data": [
    {
      "id": 17,
      "name": "BLK 457"
    }
  ]
}
GET
list roads
{{URL}}/v1/customer/external/master/roads?block_id=1&search=Shaikh
Retrieve External Master Roads
This endpoint allows you to retrieve a list of external master roads associated with a specific block ID. It is useful for obtaining road information that can be utilized in various customer-related operations.

Request Method
GET
Request Endpoint
{{URL}}/v1/customer/external/master/roads
Request Parameters
This request requires the following query parameters:

block_id (integer): The ID of the block for which you want to retrieve the associated roads.

search (string, optional): A search term to filter the roads by name.

Expected Response
On a successful request, the response will be a JSON object containing:

status (boolean): Indicates the success or failure of the request.

message (string): A message providing additional information about the request status.

data (array): An array of objects representing the roads, where each object includes:

id (integer): The unique identifier for the road.

name (string): The name of the road.

Notes
Ensure that the block_id parameter is provided in the request to avoid errors.

The response will return an array of roads, which may be empty if no roads are associated with the provided block ID.

HEADERS
x-access-key
{{x-access-key}}

x-secret-key
{{x-secret-key}}

PARAMS
block_id
1

required

search
Shaikh

optional

Example Request
list roads
curl
curl --location -g '{{URL}}/v1/customer/external/master/roads?block_id=1&search=Shaikh' \
--header 'x-access-key: b588fdce1077cd45309a91e6fdf7296ff4c92e039c3281569e75d6faf828809b' \
--header 'x-secret-key: 66ac692d64ccf7919e8a720391f5212373d4dc93f155dc3264c28016196ebd6b'
200 OK
Example Response
Body
Headers (6)
json
{
  "status": true,
  "message": "Roads list",
  "data": [
    {
      "id": 3,
      "name": "Shaikh Isa Avenue"
    }
  ]
}
