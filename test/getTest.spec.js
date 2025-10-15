const request = require('supertest');
const expect = require('chai').expect;

describe('Get API tests using supertest', () => {
    const baseUrl = 'https://amt-test.sunculture.io/api';
    const authToken = 'eaf70cc3-3ae1-4774-ba12-cbfb835a2c6e'; 
    const accountId = ''

    it('should successfully pass the test for get api', (done) => {
        console.log('Before sending the request');

        request(baseUrl)
            .get('/paymentTypes')
            .set('Accept', 'application/json')
            .set('Content-Type', 'application/json')
            .set('api_key', `${authToken}`) // Set the authorization header
            .end(function (err, res) {
                if (err) {
                    console.error('Error:', err);
                    done(err);
                } else {
                    console.log('Response received:', res.statusCode);
                    // Check the response
                    expect(res.statusCode).to.be.equal(200);
                    // expect(res.body.data[0].id).to.be.equal(9);
                    done();
                }
            });
        
        console.log('After sending the request');
        
    });

    it('should successfully pass the test to get all payments', (done) => {

        request(baseUrl)
        .get('/payments/payments')
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .set('api_key', `${authToken}`) // Set the authorization header
        .end(function (err, res) {
            if (err) {
                console.error('Error:', err);
                done(err);
            } else {
                console.log('Response received:', res.statusCode);
                // Check the response
                expect(res.statusCode).to.be.equal(200);
                // expect(res.body.data[0].id).to.be.equal(9);
                done();
            }
        });
    
    //console
    });

    it('should successfully pass the test to return a payment by account id', (done) => {

        request(baseUrl)
        .get('/payments/payments')
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .set('api_key', `${authToken}`) // Set the authorization header
        .end(function (err, res) {
            if (err) {
                console.error('Error:', err);
                done(err);
            } else {
                console.log('Response received:', res.statusCode);
                // Check the response
                expect(res.statusCode).to.be.equal(200);
                // expect(res.body.data[0].id).to.be.equal(9);
                done();
            }
        });
    
    //console
    });
})
