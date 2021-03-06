//==================
// Node Dependencies
//==================
const mysql = require("mysql");
const colors = require("colors");
const inquirer = require("inquirer");

//===============
// Required files
//===============
const utils = require("./utils.js");
const server_db = require("./auth.js");

//=================
// Global Variables
//=================
const DB = "bamazon"; //unused
const STD_TIMEOUT = 10000;
const SERVER_DB = server_db;
const PRODUCT_TABLE = "products";

//---------- Color Themes -------------
colors.setTheme(utils.colorTheme);

//------------- Functions ---------------

/**
 * Display all of the items available for sale. 
 * Include the ids, names, and prices of products for sale.
 * @param {string} table 
 * @callback fn 
 */
function selectAllFrom(table, fn = null) {
    let connection = mysql.createConnection(SERVER_DB);
    connection.query(
        {
            sql: `SELECT * FROM ${table} ORDER BY item_id;`,
            timeout: STD_TIMEOUT
        },
        function (error, result, field) {
            if (error) {
                console.log(error);
                return;
            }
            let headers = ["ID", "Product", "Price ($)"];
            let table = utils.makeCustomTable(result, headers, ["item_id", "product_name", "price"]);
            console.log(table.toString());
            if (fn) {
                fn(result);
            }
        }
    )
    connection.end();
}

/**
 * Update query of mysql.
 * @param {string} table 
 * @param {JSON} set 
 * @param {JSON} where 
 * @callback fn
 */
function updateTableInfo(table, set, where, fn = null) {
    let connection = mysql.createConnection(SERVER_DB);
    connection.query(
        {
            sql: `UPDATE ${table} SET ? WHERE ?;`,
            timeout: STD_TIMEOUT
        },
        [set, where],
        function (error, result, field) {
            if (error) {
                console.log(error);
                return;
            }

            if (fn) {
                fn(result, field);
            }
        }
    )
    connection.end();
}

/**
 * Confirm if user wishes to make a purchase.
 * @param {RawDataPacket[]} dataPackets 
 */
function askIfPurchase(dataPackets) {
    inquirer.prompt(
        [
            {
                type: 'confirm',
                message: `Would you like to make a purchase?`,
                name: "makePurchase"
            }
        ]
    ).then(function (answer) {
        if (answer.makePurchase) {
            promptBuy(dataPackets);
        } else {
            return;
        }
    })
}

/**
 * Prompt which item user wishes to purchase and quantity of purchase.
 * @param {RawDataPacket[]} dataPackets 
 */
function promptBuy(dataPackets) {
    let maxId = dataPackets.length;
    inquirer.prompt(
        [
            {
                type: 'number',
                message: "Please enter the ID of the product:",
                name: "productId",
                validate: input => {
                    return utils.isInteger(input) 
                            && 1 <= input 
                            && input <= maxId ? true : `Invalid ID`.warn;
                }
            },
            {
                type: 'number',
                message: "How many would you like to purchase?",
                name: "quantity",
                validate: input => {
                    return utils.isInteger(input) 
                            && input > -1 ? true : `Invalid input`.warn;
                }
            }
        ]
    ).then(answer => {
        let id = answer.productId;
        let quantity = answer.quantity;
        let targetPacket = dataPackets[id - 1];
        if (targetPacket.stock_quantity < quantity) {
            console.log(`Insufficient quantity!`.error);
            return;
        } else {
            let newQuantity = targetPacket.stock_quantity - quantity;
            let totalPrice = utils.roundToTwo((targetPacket.price * quantity));
            let currTotalSales = targetPacket.product_sales;
            let newTotalSales = utils.roundToTwo((totalPrice + currTotalSales));
            updateTableInfo(PRODUCT_TABLE,
                { stock_quantity: newQuantity, product_sales : newTotalSales },
                { item_id: id },
                function (result) {
                    if (result.affectedRows === 1) {
                        console.log(`Your total is $${totalPrice}`.success)
                    } else {
                        console.log(`Something's wrong, transaction failed!`.error);
                    }
                }
            );
        }
    })
}



/**
 * The beginning of app.
 */
function Main() {
    selectAllFrom(PRODUCT_TABLE, askIfPurchase);
}


//=============
// Start of App
//=============
// Main();

module.exports = Main;

