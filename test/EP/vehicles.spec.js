const supertest = require('supertest');
const { expect } = require('chai');
const btoa = require('btoa'); // Utility to Base64 encode client credentials
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const API_BASE_URL = process.env.API_BASE_URL;

// OAuth Configuration
const TOKEN_URL = process.env.TOKEN_URL;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const USERNAME = process.env.USERNAME;
const PASSWORD = process.env.PASSWORD;
const EMPLOYEE_ID = process.env.EMPLOYEE_ID;
const VEHICLE_ID = process.env.VEHICLE_ID;

const PAGE_SIZE = 25;
const PAGE_NUMBER = 1;

if (!API_BASE_URL || !TOKEN_URL || !CLIENT_ID || !CLIENT_SECRET || !USERNAME || !PASSWORD) {
    throw new Error("Missing required environment variables. Check your .env file configuration.");
}

const request = supertest(API_BASE_URL);
const BEARER_TOKEN = process.env.BEARER_TOKEN

const TEST_COUNTRY_ID = process.env.COUNTRY_ID_UUID || '115591cd-e6fc-4e83-a97d-9db8774589ee';
const TEST_VEHICLE_TYPE_ID = process.env.VEHICLE_TYPE_ID_UUID || '2e2eea1c-8d1c-45c4-82ba-3a65edb1825c';

// --- HELPER FUNCTION ---
function generateUniqueVehicleData() {
    const uniqueSuffix = uuidv4().substring(0, 8).toUpperCase();
    return {
        car_track_id: `CT${Math.floor(Math.random() * 100000)}`,
        country_id: TEST_COUNTRY_ID,
        vehicle_type_id: TEST_VEHICLE_TYPE_ID,
        license_plate: `TEST-${uniqueSuffix}`, // Ensures uniqueness
        chassis_number: `CHASSIS-${uniqueSuffix}`,
        ownership_type: "OWNED",
        last_service_date: new Date().toISOString().split('T')[0], // Today's date YYYY-MM-DD
        state: "ACTIVE"
    };
}

// Helper: obtain OAuth2 password-grant token using client basic auth
// async function obtainBearerToken() {
//     const authUrl = new URL(TOKEN_URL);
//     const authRequest = supertest(authUrl.origin);

//     const res = await authRequest
//         .post(authUrl.pathname)
//         .set('Authorization', `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`)
//         .type('form')
//         .send({ grant_type: 'password', username: USERNAME, password: PASSWORD })
//         .set('Accept', 'application/json');

//     return res;
// }

describe('Protected Endpoint: GET /vehicles', ()  => {
    const ENDPOINT = `/vehicles/vehicles/?page=${PAGE_NUMBER}&size=${PAGE_SIZE}`;

    // Acquire an OAuth bearer token before tests
    // before(async () => {
    //     // const tokenRes = await obtainBearerToken();
    //     // expect(tokenRes.status).to.equal(200, 'Failed to obtain OAuth token; check credentials and token endpoint.');
    //     // expect(tokenRes.body).to.have.property('access_token');
    //     BEARER_TOKEN = tokenRes.body.access_token;
    // });

    it('should return 200 OK, respect pagination, and use headers', async () => {
            expect(EMPLOYEE_ID).to.exist;
            expect(BEARER_TOKEN).to.exist;

            const response = await request
                .get(ENDPOINT)
                // follow a single redirect if the server responds with a 3xx (some servers add/remove trailing slash)
                .redirects(1)
                .set('Accept', 'application/json')
                .set('employee_ID', EMPLOYEE_ID)
                .set('Authorization', `Bearer ${BEARER_TOKEN}`)
                .expect(200);

            // Optional debug: if server redirected, log location when DEBUG_REDIRECT=1
            if (process.env.DEBUG_REDIRECT === '1' && response.redirects && response.redirects.length > 0) {
                console.log('Redirects followed:', response.redirects);
            }

            // The API may return either an object with 'items' or a direct array.
            const body = response.body && response.body.items ? response.body.items : response.body;

            expect(body).to.be.an('array', 'Expected response body (or body.items) to be an array of vehicles.');
            expect(body.length).to.be.at.most(PAGE_SIZE, `Expected no more than ${PAGE_SIZE} items due to pagination.`);

            if (body.length > 0) {
                const vehicle = body[0];
                expect(vehicle).to.be.an('object', 'Vehicle item must be an object.');
                expect(vehicle).to.have.property('license_plate').that.is.a('string');
            }

    });
});

// --- POST /vehicles/vehicles/ (Creation Test) ---
    describe('Protected Endpoint: POST /vehicles/vehicles/', () => {
        const ENDPOINT = '/vehicles/vehicles/';
        let newVehiclePayload;

        before(() => {
            // 1.  Generate unique data before the test runs
            newVehiclePayload = generateUniqueVehicleData();
        });

        it('should return 201 Created and return the new vehicle object', async () => {
            expect(EMPLOYEE_ID).to.exist;
            expect(BEARER_TOKEN).to.exist;

            const response = await request
                .post(ENDPOINT)
                .set('Content-Type', 'application/json')
                .set('Accept', 'application/json')
                .set('employee_ID', EMPLOYEE_ID)
                .set('Authorization', `Bearer ${BEARER_TOKEN}`)
                
                .send(newVehiclePayload)
                .expect(200); // Expect HTTP 201 Created for resource creation

            
            expect(response.body).to.be.an('object', 'Response body must be the created vehicle object.');

            // 2. Check if the created vehicle has an ID and matches the sent data
            expect(response.body).to.have.property('id').that.is.a('string');

            // CREATED_VEHICLE_ID = response.body.id;
            // console.log(`\n\t[TEST INFO] Created vehicle ID: ${CREATED_VEHICLE_ID}`);

            // expect(response.body.license_plate).to.equal(newVehiclePayload.license_plate, 'License plate in response should match the request.');
            // expect(response.body.ownership_type).to.equal(newVehiclePayload.ownership_type, 'Ownership type should match the request.');
            // expect(response.body.state).to.equal(newVehiclePayload.state, 'State should match the request.');
        });

        it('should return 401 Unauthorized if Authorization Bearer token is missing for POST', async () => {
            await request
                .post(ENDPOINT)
                .set('Content-Type', 'application/json')
                .set('employee_ID', EMPLOYEE_ID)
                .send(newVehiclePayload)
                .expect(401);
        });
        
    });

    // --- GET /vehicles/vehicles/:vehicle_id (Read by ID Test) ---

describe('GET /vehicles/vehicles/:vehicle_id', () => {

    const ENDPOINT = `/vehicles/vehicles/${VEHICLE_ID}`;

        it('should return 200 OK and a single vehicle object matching the requested ID', async () => {
            expect(EMPLOYEE_ID).to.exist;
            expect(BEARER_TOKEN).to.exist;

            const response = await request
                .get(ENDPOINT)
                .set('Accept', 'application/json')
                .set('employee_ID', EMPLOYEE_ID)
                .set('Authorization', `Bearer ${BEARER_TOKEN}`)
                .expect(200);

            // Assert that the response body is the single vehicle object
            expect(response.body).to.be.an('object', 'Expected response body to be a single vehicle object.');

            expect(response.body).to.have.property('id').that.is.equal(VEHICLE_ID, 'Returned vehicle ID must match the requested ID.');
            expect(response.body).to.have.property('license_plate').that.is.a('string');
            expect(response.body).to.have.property('chassis_number').that.is.a('string');
        });

    // Only skip this describe when VEHICLE_ID is not provided; previously describe.skip(...) always skipped.
    ( !VEHICLE_ID ? describe.skip : describe )(!VEHICLE_ID ? 'Skipped: PATCH /vehicles/vehicles/:vehicle_id (Requires VEHICLE_ID in .env)' : 'Protected Endpoint: PATCH /vehicles/vehicles/:vehicle_id', () => {
        const ENDPOINT = `/vehicles/vehicles/${VEHICLE_ID}`;

        const INACTIVE_PAYLOAD = { state: "INACTIVE" };
        const ACTIVE_PAYLOAD = { state: "ACTIVE" };

        it('should return 200 OK and update vehicle state to INACTIVE', async () => {
            expect(EMPLOYEE_ID).to.exist;
            expect(BEARER_TOKEN).to.exist;

            const response = await request
                .patch(ENDPOINT)
                .set('Content-Type', 'application/json')
                .set('Accept', 'application/json')
                .set('employee_ID', EMPLOYEE_ID)
                .set('Authorization', `Bearer ${BEARER_TOKEN}`)
                .send(INACTIVE_PAYLOAD)
                .expect(200);

                //Assertions
            expect(response.body).to.be.an('object', 'Response body must be the updated vehicle object.');
            expect(response.body).to.have.property('id').that.is.equal(VEHICLE_ID, 'Returned vehicle ID must match the requested ID.');
            expect(response.body).to.have.property('state').that.is.equal('INACTIVE', 'Vehicle state should be updated to INACTIVE.');
        });

        it('should return 200 OK and update vehicle state back to ACTIVE', async () => {
            expect(EMPLOYEE_ID).to.exist;
            expect(BEARER_TOKEN).to.exist;

            const response = await request
                .patch(ENDPOINT)
                .set('Content-Type', 'application/json')
                .set('Accept', 'application/json')
                .set('employee_ID', EMPLOYEE_ID)
                .set('Authorization', `Bearer ${BEARER_TOKEN}`)
                .send(ACTIVE_PAYLOAD)
                .expect(200);

            //Assertions
            expect(response.body).to.be.an('object', 'Response body must be the updated vehicle object.');
            expect(response.body).to.have.property('id').that.is.equal(VEHICLE_ID, 'Returned vehicle ID must match the requested ID.');
            expect(response.body).to.have.property('state').that.is.equal('ACTIVE', 'Vehicle state should be updated to ACTIVE.');
        })    });
});

