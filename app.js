const fs = require('fs');
const bluebird = require('bluebird');
const promiseRequest = bluebird.promisify(require('request'));

const args = process.argv.slice(2);
const inputFile = args[0];
let data = [];

fs.readFile(inputFile, 'utf8',(err, fileContent) => {
    if( err ) {
        throw err;
    } else {
        data = JSON.parse(fileContent.toString());

        Promise.all([
            promiseRequest({url: 'http://private-38e18c-uzduotis.apiary-mock.com/config/cash-in'}),
            promiseRequest({url: 'http://private-38e18c-uzduotis.apiary-mock.com/config/cash-out/natural'}),
            promiseRequest({url: 'http://private-38e18c-uzduotis.apiary-mock.com/config/cash-out/juridical'}),
        ])
        .then(function(response) {
            let cashInConfig = JSON.parse(response[0].body);
            let cashOutNaturalConfig = JSON.parse(response[1].body);
            let cashOutJuridicalConfig = JSON.parse(response[2].body);
        
            let remainingAmount = cashOutNaturalConfig.week_limit.amount;

            data.forEach(entry => {
                const type = entry.type;
                if (entry.type === "cash_in") {
                    commission = (entry.operation.amount * cashInConfig.percents) / 100;
                    if (commission > cashInConfig.max.amount) commission = cashInConfig.max.amount;
                } else {
                    if (entry.user_type === "natural") {
                        let amount;
                        if (entry.operation.amount > remainingAmount) {
                            amount = entry.operation.amount - remainingAmount;
                            remainingAmount = 0;
                            commission = (amount * cashOutNaturalConfig.percents) / 100;
                        } else {
                            remainingAmount = remainingAmount - entry.operation.amount;
                            commission = 0;
                        }
                        let entryDate = new Date(entry.date);
                        if (entryDate.getDay() === 0) {
                            remainingAmount = cashOutNaturalConfig.week_limit.amount;
                        }
                    } else {
                        commission = (entry.operation.amount * cashOutJuridicalConfig.percents) / 100;
                        if (commission < cashOutJuridicalConfig.min.amount) commission = cashOutJuridicalConfig.min.amount;
                    }
                }
                console.log(commission.toFixed(2));
            });
        })
        .catch(function(error) {
            console.log(error);
        });
    }
})
