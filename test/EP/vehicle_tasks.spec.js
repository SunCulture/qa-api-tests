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
const TASK_ID = process.env.TASK_ID;

const PAGE_SIZE = 25;
const PAGE_NUMBER = 1;

if (!API_BASE_URL || !TOKEN_URL || !CLIENT_ID || !CLIENT_SECRET || !USERNAME || !PASSWORD) {
    throw new Error("Missing required environment variables. Check your .env file configuration.");
}

const request = supertest(API_BASE_URL);
const BEARER_TOKEN = process.env.BEARER_TOKEN;

// Test data constants
const TEST_VEHICLE_ID = VEHICLE_ID || 'test-vehicle-id';
const TEST_TASK_ID = TASK_ID || 'test-task-id';

// --- HELPER FUNCTION ---
function generateUniqueTaskData() {
    const uniqueSuffix = uuidv4().substring(0, 8).toUpperCase();
    return {
        vehicle_id: TEST_VEHICLE_ID,
        title: `Test Task ${uniqueSuffix}`,
        description: `Test task description for ${uniqueSuffix}`,
        priority: "MEDIUM",
        status: "PENDING",
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        assigned_to: EMPLOYEE_ID,
        task_type: "MAINTENANCE"
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

describe('Protected Endpoint: GET /vehicles/tasks', () => {
    const ENDPOINT = `/vehicles/tasks/?page=${PAGE_NUMBER}&size=${PAGE_SIZE}`;

    // Acquire an OAuth bearer token before tests
    // before(async () => {
    //     // const tokenRes = await obtainBearerToken();
    //     // expect(tokenRes.status).to.equal(200, 'Failed to obtain OAuth token; check credentials and token endpoint.');
    //     // expect(tokenRes.body).to.have.property('access_token');
    //     // BEARER_TOKEN = tokenRes.body.access_token;
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

        expect(body).to.be.an('array', 'Expected response body (or body.items) to be an array of tasks.');
        expect(body.length).to.be.at.most(PAGE_SIZE, `Expected no more than ${PAGE_SIZE} items due to pagination.`);

        if (body.length > 0) {
            const task = body[0];
            expect(task).to.be.an('object', 'Task item must be an object.');
            expect(task).to.have.property('title').that.is.a('string');
            expect(task).to.have.property('status').that.is.a('string');
        }
    });

    it('should return 401 Unauthorized if Authorization Bearer token is missing', async () => {
        await request
            .get(ENDPOINT)
            .set('Accept', 'application/json')
            .set('employee_ID', EMPLOYEE_ID)
            .expect(401);
    });
});

// --- POST /vehicles/tasks/ (Creation Test) ---
describe('Protected Endpoint: POST /vehicles/tasks/', () => {
    const ENDPOINT = '/vehicles/tasks/';
    let newTaskPayload;

    before(() => {
        // 1. Use the sample payload shape (from Swagger) to avoid server validation errors.
        const today = new Date().toISOString().split('T')[0];
        newTaskPayload = {
            request_id: uuidv4(),
            country_id: TEST_VEHICLE_ID === 'test-vehicle-id' ? TEST_VEHICLE_ID : TEST_VEHICLE_ID || TEST_VEHICLE_ID,
            assigned_to: EMPLOYEE_ID ? parseInt(EMPLOYEE_ID, 10) : 0,
            status: 'PENDING',
            client_name: 'Automated Test Client',
            client_id: 0,
            client_location: 'Test Location',
            reason: 'Automated test creation',
            scheduled_date: today,
            completed_date: today
        };
    });

    it('should return 201 Created and return the new task object', async () => {
        expect(EMPLOYEE_ID).to.exist;
        expect(BEARER_TOKEN).to.exist;

        // Capture full response so we can log unexpected statuses for debugging
        const response = await request
            .post(ENDPOINT)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('employee_ID', EMPLOYEE_ID)
            .set('Authorization', `Bearer ${BEARER_TOKEN}`)
            .send(newTaskPayload);

        // Debug output when unexpected status (enable with DEBUG_TASKS=1 in .env)
        if (process.env.DEBUG_TASKS === '1' && response.status !== 201) {
            console.log('[DEBUG] POST /vehicles/tasks response status:', response.status);
            console.log('[DEBUG] POST /vehicles/tasks response body:', response.body);
        }

        // Accept either 201 Created or 200 OK depending on API implementation
        expect([200, 201]).to.include(response.status, `Expected 201 Created (or 200) but got ${response.status}`);

        expect(response.body).to.be.an('object', 'Response body must be the created task object.');

        // 2. Check if the created task has an ID and matches the sent data
        expect(response.body).to.have.property('id').that.is.a('string');
        expect(response.body.title).to.equal(newTaskPayload.title, 'Task title in response should match the request.');
        expect(response.body.priority).to.equal(newTaskPayload.priority, 'Priority should match the request.');
        expect(response.body.status).to.equal(newTaskPayload.status, 'Status should match the request.');
    });

    it('should return 401 Unauthorized if Authorization Bearer token is missing for POST', async () => {
        await request
            .post(ENDPOINT)
            .set('Content-Type', 'application/json')
            .set('employee_ID', EMPLOYEE_ID)
            .send(newTaskPayload)
            .expect(401);
    });

    it('should return 400 Bad Request if required fields are missing', async () => {
        const invalidPayload = {
            // Missing required fields like title, vehicle_id
            description: 'Test description'
        };

        const response = await request
            .post(ENDPOINT)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('employee_ID', EMPLOYEE_ID)
            .set('Authorization', `Bearer ${BEARER_TOKEN}`)
            .send(invalidPayload);

        if (process.env.DEBUG_TASKS === '1' && response.status !== 400) {
            console.log('[DEBUG] POST /vehicles/tasks (invalid payload) status:', response.status);
            console.log('[DEBUG] POST /vehicles/tasks (invalid payload) body:', response.body);
        }

        expect(response.status).to.equal(400);
    });
});

// --- GET /vehicles/tasks/:task_id (Read by ID Test) ---
describe('GET /vehicles/tasks/:task_id', () => {
    const ENDPOINT = `/vehicles/tasks/${TEST_TASK_ID}`;

    it('should return 200 OK and a single task object matching the requested ID', async () => {
        expect(EMPLOYEE_ID).to.exist;
        expect(BEARER_TOKEN).to.exist;

        const response = await request
            .get(ENDPOINT)
            .set('Accept', 'application/json')
            .set('employee_ID', EMPLOYEE_ID)
            .set('Authorization', `Bearer ${BEARER_TOKEN}`)
            .expect(200);

        // Assert that the response body is the single task object
        expect(response.body).to.be.an('object', 'Expected response body to be a single task object.');

        expect(response.body).to.have.property('id').that.is.equal(TEST_TASK_ID, 'Returned task ID must match the requested ID.');
        expect(response.body).to.have.property('title').that.is.a('string');
        expect(response.body).to.have.property('status').that.is.a('string');
        expect(response.body).to.have.property('priority').that.is.a('string');
    });

    it('should return 404 Not Found for non-existent task ID', async () => {
        const nonExistentTaskId = 'non-existent-task-id-12345';
        const nonExistentEndpoint = `/vehicles/tasks/${nonExistentTaskId}`;

        await request
            .get(nonExistentEndpoint)
            .set('Accept', 'application/json')
            .set('employee_ID', EMPLOYEE_ID)
            .set('Authorization', `Bearer ${BEARER_TOKEN}`)
            .expect(404);
    });

    it('should return 401 Unauthorized if Authorization Bearer token is missing', async () => {
        await request
            .get(ENDPOINT)
            .set('Accept', 'application/json')
            .set('employee_ID', EMPLOYEE_ID)
            .expect(401);
    });
});

// --- PATCH /vehicles/tasks/:task_id (Update Test) ---
// Only skip this describe when TASK_ID is not provided
(!TEST_TASK_ID ? describe.skip : describe)(!TEST_TASK_ID ? 'Skipped: PATCH /vehicles/tasks/:task_id (Requires TASK_ID in .env)' : 'Protected Endpoint: PATCH /vehicles/tasks/:task_id', () => {
    const ENDPOINT = `/vehicles/tasks/${TEST_TASK_ID}`;

    const IN_PROGRESS_PAYLOAD = { status: "IN_PROGRESS" };
    const COMPLETED_PAYLOAD = { status: "COMPLETED" };
    const HIGH_PRIORITY_PAYLOAD = { priority: "HIGH" };

    it('should return 200 OK and update task status to IN_PROGRESS', async () => {
        expect(EMPLOYEE_ID).to.exist;
        expect(BEARER_TOKEN).to.exist;

        const response = await request
            .patch(ENDPOINT)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('employee_ID', EMPLOYEE_ID)
            .set('Authorization', `Bearer ${BEARER_TOKEN}`)
            .send(IN_PROGRESS_PAYLOAD)
            .expect(200);

        // Assertions
        expect(response.body).to.be.an('object', 'Response body must be the updated task object.');
        expect(response.body).to.have.property('id').that.is.equal(TEST_TASK_ID, 'Returned task ID must match the requested ID.');
        expect(response.body).to.have.property('status').that.is.equal('IN_PROGRESS', 'Task status should be updated to IN_PROGRESS.');
    });

    it('should return 200 OK and update task priority to HIGH', async () => {
        expect(EMPLOYEE_ID).to.exist;
        expect(BEARER_TOKEN).to.exist;

        const response = await request
            .patch(ENDPOINT)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('employee_ID', EMPLOYEE_ID)
            .set('Authorization', `Bearer ${BEARER_TOKEN}`)
            .send(HIGH_PRIORITY_PAYLOAD)
            .expect(200);

        // Assertions
        expect(response.body).to.be.an('object', 'Response body must be the updated task object.');
        expect(response.body).to.have.property('id').that.is.equal(TEST_TASK_ID, 'Returned task ID must match the requested ID.');
        expect(response.body).to.have.property('priority').that.is.equal('HIGH', 'Task priority should be updated to HIGH.');
    });

    it('should return 200 OK and update task status to COMPLETED', async () => {
        expect(EMPLOYEE_ID).to.exist;
        expect(BEARER_TOKEN).to.exist;

        const response = await request
            .patch(ENDPOINT)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('employee_ID', EMPLOYEE_ID)
            .set('Authorization', `Bearer ${BEARER_TOKEN}`)
            .send(COMPLETED_PAYLOAD)
            .expect(200);

        // Assertions
        expect(response.body).to.be.an('object', 'Response body must be the updated task object.');
        expect(response.body).to.have.property('id').that.is.equal(TEST_TASK_ID, 'Returned task ID must match the requested ID.');
        expect(response.body).to.have.property('status').that.is.equal('COMPLETED', 'Task status should be updated to COMPLETED.');
    });

    it('should return 401 Unauthorized if Authorization Bearer token is missing for PATCH', async () => {
        await request
            .patch(ENDPOINT)
            .set('Content-Type', 'application/json')
            .set('employee_ID', EMPLOYEE_ID)
            .send(IN_PROGRESS_PAYLOAD)
            .expect(401);
    });

    it('should return 400 Bad Request for invalid status value', async () => {
        const invalidPayload = { status: "INVALID_STATUS" };

        await request
            .patch(ENDPOINT)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('employee_ID', EMPLOYEE_ID)
            .set('Authorization', `Bearer ${BEARER_TOKEN}`)
            .send(invalidPayload)
            .expect(400);
    });
});

// --- DELETE /vehicles/tasks/:task_id (Delete Test) ---


// --- GET /vehicles/:vehicle_id/tasks (Get tasks for specific vehicle) ---
describe('GET /vehicles/:vehicle_id/tasks', () => {
    const ENDPOINT = `/vehicles/${TEST_VEHICLE_ID}/tasks/?page=${PAGE_NUMBER}&size=${PAGE_SIZE}`;

    it('should return 200 OK and return tasks for the specific vehicle', async () => {
        expect(EMPLOYEE_ID).to.exist;
        expect(BEARER_TOKEN).to.exist;

        const response = await request
            .get(ENDPOINT)
            .redirects(1)
            .set('Accept', 'application/json')
            .set('employee_ID', EMPLOYEE_ID)
            .set('Authorization', `Bearer ${BEARER_TOKEN}`)
            .expect(200);

        // The API may return either an object with 'items' or a direct array.
        const body = response.body && response.body.items ? response.body.items : response.body;

        expect(body).to.be.an('array', 'Expected response body (or body.items) to be an array of tasks.');
        expect(body.length).to.be.at.most(PAGE_SIZE, `Expected no more than ${PAGE_SIZE} items due to pagination.`);

        if (body.length > 0) {
            const task = body[0];
            expect(task).to.be.an('object', 'Task item must be an object.');
            expect(task).to.have.property('vehicle_id').that.is.equal(TEST_VEHICLE_ID, 'All tasks should belong to the specified vehicle.');
            expect(task).to.have.property('title').that.is.a('string');
        }
    });

    it('should return 401 Unauthorized if Authorization Bearer token is missing', async () => {
        await request
            .get(ENDPOINT)
            .set('Accept', 'application/json')
            .set('employee_ID', EMPLOYEE_ID)
            .expect(401);
    });

    it('should return 404 Not Found for non-existent vehicle ID', async () => {
        const nonExistentVehicleId = 'non-existent-vehicle-id-12345';
        const nonExistentEndpoint = `/vehicles/${nonExistentVehicleId}/tasks/?page=${PAGE_NUMBER}&size=${PAGE_SIZE}`;

        await request
            .get(nonExistentEndpoint)
            .set('Accept', 'application/json')
            .set('employee_ID', EMPLOYEE_ID)
            .set('Authorization', `Bearer ${BEARER_TOKEN}`)
            .expect(404);
    });
});
