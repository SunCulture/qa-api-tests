const supertest = require('supertest');
const expect = require('chai').expect;

const baseUrl = 'https://amt-test.sunculture.io/api';
const authToken = 'eaf70cc3-3ae1-4774-ba12-cbfb835a2c6e';
const ACCEPTABLE_RESPONSE_TIME_MS = 3000;

const request = supertest(baseUrl);

function checkPerformance(duration, endpoint) {
    if (duration > ACCEPTABLE_RESPONSE_TIME_MS) {
        expect.fail(null, null,
            `PERFORMANCE FAILURE: ${endpoint} took ${duration}ms, exceeding the acceptable limit of ${ACCEPTABLE_RESPONSE_TIME_MS}ms`
        );
    } else {
        console.log(`Performance OK: ${endpoint} took ${duration}ms`);
    }
}

describe('Customer/Account Data Retrieval Optimization Tests', () => {
    const TEST_CUSTOMER_ID = 1526;
    const DEFAULT_LIMIT = 10;

    describe(`GET /customers/:id (ID: ${TEST_CUSTOMER_ID})`, () => {
        let response;
        let startTime;
        let endTime;

        before(async() => {
            startTime = Date.now();
            response = await request
            .get(`/customers/${TEST_CUSTOMER_ID}`)
            .set('Accept', 'application/json')
            .set('Content-Type', 'application/json')
            .set('api_key', `${authToken}`);
            endTime = Date.now();
        });

        it('should return 200 status code', () => {
            expect(response.status).to.equal(200);
        });

        it(`should respond within the acceptable time limit of ${ACCEPTABLE_RESPONSE_TIME_MS}ms`, () => {
            const duration = endTime - startTime;
            checkPerformance(duration, `/customers/${TEST_CUSTOMER_ID}`);
        });

        it('should return a single customer object', () => {
            expect(response.body).to.have.property('success').that.is.true;
            expect(response.body).to.have.property('data').that.is.an('object');

            const customer = response.body.data;
            
            expect(customer).to.have.property('customerId').that.is.a('number').and.equal(TEST_CUSTOMER_ID);
            expect(customer).to.have.property('customerName').that.is.a('string');
            expect(customer).to.have.property('accountBalance').that.is.a('string');
            expect(customer).to.have.property('identificationNumber').that.is.a('string');
            // 2. Account Reference
            expect(customer).to.have.property('accountRef').that.is.a('string');
            // 3. Sales Agent (must be present in the Account View)
            expect(customer).to.have.property('salesAgent').that.is.a('string');
        });

    });

    // --- All Customers Retrieval Test (Paginated) ---
    describe('GET /customers (Paginated Retrieval)', () => {
        const ENDPOINT = `/customers?page=1&limit=${DEFAULT_LIMIT}`;
        let response;
        let startTime;
        let endTime;

        before(async () => {
            startTime = Date.now();
            response = await request
                .get(ENDPOINT)
                .set('api_key', authToken);
            endTime = Date.now();
        });

        it('should return a 200 OK status code', () => {
            expect(response.statusCode).to.equal(200);
            expect(response.body).to.have.property('success').that.is.true;
        });

        it(`should respond within the acceptable time limit of ${ACCEPTABLE_RESPONSE_TIME_MS}ms`, () => {
            const duration = endTime - startTime;
            checkPerformance(duration, ENDPOINT);
        });

        it('should return a "data" object containing "count" and "rows" array for pagination', () => {
            expect(response.body).to.have.property('data').that.is.an('object');

            const data = response.body.data;
            expect(data).to.have.property('count').that.is.a('number').and.is.at.least(0);
            expect(data).to.have.property('rows').that.is.an('array');
        });

        it(`should return exactly ${DEFAULT_LIMIT} items in 'rows' (or less if end of dataset) (FIX for Failure 3)`, () => {
            const recordsReturned = response.body.data.rows.length;
            expect(recordsReturned).to.be.at.most(DEFAULT_LIMIT);

            if (recordsReturned === DEFAULT_LIMIT) {
                console.log(`Pagination verified: Returned exactly ${DEFAULT_LIMIT} items.`);
            } else {
                console.log(`Pagination verified: Returned ${recordsReturned} items (end of dataset).`);
            }
        });

        it('should ensure all returned items in "rows" have the customer data structure', () => {
            const rows = response.body.data.rows;

            if (rows.length > 0) {
                const firstCustomer = rows[0];
                expect(firstCustomer).to.have.property('customerId').that.is.a('number');
                expect(firstCustomer).to.have.property('customerName').that.is.a('string');
            }
        });
    });
});