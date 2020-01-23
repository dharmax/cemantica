import * as should from 'should'
import {Api} from "./test-belt";
import {describe, it} from "mocha";
import {delay, props} from 'bluebird';
import '../lib/arrays'
import {webServerPort} from "../config/server-address";

describe('Basic tests', () => {

    const api = new Api(`http://localhost:${webServerPort}/api/`)

    // @ts-ignore
    const get = (...args) => api.api(...args)
    // @ts-ignore
    const put = (...args) => api.put(...args)
    // @ts-ignore
    const post = (...args) => api.post(...args)
    // @ts-ignore
    const remove = (...args) => api.remove(...args)

    async function loginUser1() {
        const email = 'tester1@test.com'
        const password = 'testertester'
        return await post(null, 'session/login', {email, password})
    }

    async function loginUser2() {
        const email = 'tester2@test.com'
        const password = 'testertester'
        return post(null, 'session/login', {email, password})
    }

    async function loginAdmin() {
        const email = 'superuser@test.com'
        const password = 'testertester'
        return await post(null, 'session/login', {email, password})
    }


    before(async () => {
        await post(null, 'sys/purge-database', {code: '87487965782'})
    })

    after(() => {
        process.exit(0)
    })

    describe('Most basic session and status checks', async () => {

        it('should see if server is alive', async () => {

            const r = await get(null, 'is-alive')
            should(r).be.equal('Hello !')
        })

        it('should sign up a test users', async () => {
            const r = await post(null, 'session/signup', {
                email: 'tester1@test.com',
                password: 'testertester',
                name: 'tester1'
            })

            should(r).not.be.undefined()
            r.should.have.property('validationToken')

            const result = await post(null, 'session/signup/confirm', {
                validationToken: r.validationToken,
                emailCode: 'xxxxx',
                smsCode: 'xxxxx'
            })
            result.session.should.have.property('token')

            // just add a second user

            await post(null, 'session/signup/confirm', {
                validationToken: (await post(null, 'session/signup', {
                    email: 'tester2@test.com',
                    password: 'testertester',
                    name: 'tester2'
                })).validationToken,
                emailCode: 'xxxxx',
                smsCode: 'xxxxx'
            })


        })
        it('should sign up a test admin user', async () => {
            const r = await post(null, 'session/signup', {
                email: 'superuser@test.com', // this email is reserved for superuser (in test env only)
                password: 'testertester',
                name: 'testsuperuser'
            })

            should(r).not.be.undefined()
            r.should.have.property('validationToken')

            const result = await post(null, 'session/signup/confirm', {
                validationToken: r.validationToken,
                emailCode: 'xxxxx',
                smsCode: 'xxxxx'
            })
            result.session.should.have.property('token')
        })

        it('should log in via test username and password', async () => {
            const session = await loginUser1()

            should(session).not.be.undefined()
            session.should.have.properties(['token', 'apiVersion'])
        })
    })

    describe('Basic user functions', async () => {

        it('should read user data', async () => {
            const session = await loginUser1()
            const user = await get(session, 'users/myProfile')
            user.name.should.be.equal('tester1')
        })

        it('should update generalBio field', async () => {
            const session = await loginUser1()
            let user = await get(session, 'users/myProfile')
            const bio = user.generalBio
            let value = parseInt(bio) || 0
            value++
            await put(session, `users/${session.userId}`, {generalBio: '' + value})
            user = await get(session, 'users/myProfile')
            user.generalBio.should.be.equal('' + value)

        })

        it('should get user list', async () => {
            // user have to have the right permissions for such an operation
            const session = await loginAdmin()
            const users = await get(session, 'users')
            users.items.should.not.be.empty()
        })

    })


    describe('Job scheduling', () => {

        it.skip('should schedule a report job and quickly delete it', async () => {

            const session = await loginAdmin()

            const creationTime = new Date()
            const jobId = await post(session, `job-manager`, {
                jobName: 'activity-report-2',
                entityType: 'Retailer',
                // entityId: retailer.id,
                replace: false,
                cron: '*/1 * * * *',
                once: true,
                operation: 'sendActivityReport',
                data: {
                    days: 1,
                }
            })


            // see that the job appears in the general list of jobs
            let allJobs = await get(session, `job-manager`)
            should(allJobs.find(j => j.id == jobId)).not.be.null()

            await remove(session, `job-manager`, {jobName: 'activity-report-2'})


            await delay(1000)

            allJobs = await get(session, `job-manager`)
            should(allJobs.find(j => j.id == jobId)).be.undefined()
        })
        it.skip('should schedule a report job for a retailer', async () => {

            const session = await loginAdmin()

            const creationTime = new Date()
            let entityId = 1
            const jobId = await post(session, `job-manager`, {
                jobName: 'activity-report',
                entityType: 'Retailer',
                // entityId: retailer.id,
                replace: true,
                cron: '*/1 * * * *',
                once: false,
                operation: 'sendActivityReport',
                data: {
                    days: 1,
                }
            })

            // see that the job appears under the entity's assigned jobs
            const entityJobs: any[] = await get(session, `job-manager?entityType=Retailer&entityId=${entityId}`)
            should(entityJobs.find(j => j.id == jobId)).not.be.undefined()


            // see that the job appears in the general list of jobs
            const allJobs = await get(session, `job-manager`)
            should(allJobs.find(j => j.id == jobId)).not.be.null()


            // checks if the job was executed

            const adminSession = await loginAdmin()

            await delay(70000) // we set it to fire after one minute, so we have to wait


            const journal = await post(adminSession, `admin/journal/query`, {
                from: creationTime,
                to: new Date(Date.now() + 10000),
                query: {action: 'firing scheduled job'}
            })

            journal[0].data.jobName.should.be.equal('activity-report')

        })
    })



    describe('database browsing', () => {

        it('read ontology', async () => {

            const adminSession = await loginAdmin()

            const ontology = await get(adminSession, `admin/ontology`)
            ontology.should.have.properties(['entityDcrs', 'predicateDcrs'])


        })

        it('read entities', async () => {

            const adminSession = await loginAdmin()

            const entities = await get(adminSession, `admin/browse/User`)

            entities.totalFiltered.should.be.above(0)

            const entityData = await get(adminSession, `admin/xray/User/${entities.items[0].id}`)

            entityData.should.have.properties(['incoming', 'outgoing'])

        })

    })
    describe('setting admin role to another user', () => {
        it('grant admin role', async () => {
            const unprivLogin = await loginUser2()

            try {
                await get(unprivLogin, `admin/browse/User`)
            } catch (e) {
                // should reach here!
                const adminSession = await loginAdmin()
                await put(adminSession, `admin/set-admin-role/Admin/${unprivLogin.userId}`, {on: true})

                await get(unprivLogin, `admin/browse/User`)
                return
            }
            throw 'should have failed'

        })
    })
})


