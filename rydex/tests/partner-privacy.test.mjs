import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import ts from 'typescript'
import crypto from 'node:crypto'

const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '../src')
function load(relative, mocks = {}, cache = new Map()) {
    const file = path.resolve(root, relative)
    if (cache.has(file)) return cache.get(file)
    const output = { exports: {} }
    cache.set(file, output.exports)
    const localRequire = id => {
        if (Object.hasOwn(mocks, id)) return mocks[id]
        if (id.startsWith('@/')) return load(id.slice(2) + '.ts', mocks, cache)
        return require(id)
    }
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename: file })(localRequire, output, output.exports)
    return output.exports
}
const jsonRequest = body => new Request('http://localhost/api/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
function query(value) { return { select() { return this }, populate() { return this }, lean() { return this }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject) } } }
const partnerId = '111111111111111111111111'
const vehicleId = '222222222222222222222222'
function fixture() {
    let uploads = 0, writes = 0, vehicle = null
    const partner = { _id: partnerId, name: 'Test Partner', email: 'partner@example.invalid', role: 'user', partnerStatus: 'pending', partnerOnBoardingSteps: 0, async save() { writes++ } }
    let role = 'user'
    const mocks = {
        '@/auth': { auth: async () => role ? { user: { email: partner.email, role } } : null },
        '@/lib/db': async () => {},
        '@/models/user.model': {
            findOne: () => query(role === 'admin' ? { role: 'admin' } : partner),
            findById: () => query(partner)
        },
        '@/models/vehicle.model': {
            findOne: filter => query(filter.number ? null : vehicle),
            findById: () => query(vehicle),
            findOneAndUpdate: (_filter, update) => {
                vehicle = { ...vehicle, _id: vehicleId, owner: partnerId, ...update.$set, async save() { writes++ } }
                writes++
                return query(vehicle)
            }
        },
        '@/lib/cloudinary': async () => { uploads++; return 'https://example.invalid/vehicle.png' }
    }
    return { mocks, partner, get vehicle() { return vehicle }, get uploads() { return uploads }, get writes() { return writes }, setRole(value) { role = value } }
}
const profile = { name: 'Test Partner', mobileNumber: '9876543210', type: 'car', number: 'MH12AB1234', vehicleModel: 'Test Car' }
function pricingRequest(extra = false, invalid = false) {
    const form = new FormData()
    form.set('baseFare', '0'); form.set('pricePerKM', '12'); form.set('waitingCharge', '0')
    form.set('image', new File([invalid ? '%PDF-1.7' : new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0])], 'vehicle.png', { type: 'image/png' }))
    if (extra) form.set('accountNumber', 'dummy-rejected-value')
    return new Request('http://localhost/api/test', { method: 'POST', body: form })
}

for (const endpoint of ['partner/onboarding/documents', 'partner/onboarding/bank', 'partner/video-kyc/request', 'admin/video-kyc/pending', 'admin/video-kyc/start/[id]', 'admin/video-kyc/complete']) {
    test(`retired ${endpoint} rejects requests without reading data or importing storage`, async () => {
        const route = load(`app/api/${endpoint}/route.ts`)
        for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
            const response = await route[method](new Proxy({}, { get() { throw new Error('Request must not be read') } }))
            assert.equal(response.status, 410)
            assert.equal((await response.json()).code, 'FEATURE_UNAVAILABLE')
        }
    })
}

test('new partner completes profile → pricing → submission → admin approval without verification data', async () => {
    const f = fixture()
    const vehicle = load('app/api/partner/onboarding/vehicle/route.ts', f.mocks)
    const pricing = load('app/api/partner/onboarding/pricing/route.ts', f.mocks)
    const submit = load('app/api/partner/onboarding/submit/route.ts', f.mocks)
    const approve = load('app/api/admin/reviews/partner/[id]/approve/route.ts', f.mocks)
    assert.equal((await vehicle.POST(jsonRequest(profile))).status, 200)
    assert.equal(f.partner.role, 'partner'); assert.equal(f.partner.partnerOnBoardingSteps, 1)
    f.setRole('partner')
    assert.equal((await pricing.POST(pricingRequest())).status, 200)
    assert.equal(f.uploads, 1); assert.equal(f.partner.partnerOnBoardingSteps, 2)
    f.setRole('admin')
    assert.equal((await approve.POST(jsonRequest({}), { params: Promise.resolve({ id: partnerId }) })).status, 409)
    f.setRole('partner')
    assert.equal((await submit.POST(jsonRequest({}))).status, 200)
    assert.equal(f.partner.partnerOnBoardingSteps, 3)
    assert.ok(f.partner.partnerApplicationSubmittedAt)
    f.setRole('admin')
    assert.equal((await approve.POST(jsonRequest({}), { params: Promise.resolve({ id: partnerId }) })).status, 200)
    assert.equal(f.partner.partnerStatus, 'approved'); assert.equal(f.vehicle.status, 'approved')
    assert.equal(approve.GET, undefined)
})

test('unknown sensitive fields are rejected before writes or uploads; spoofed file types fail', async () => {
    const f = fixture()
    const vehicle = load('app/api/partner/onboarding/vehicle/route.ts', f.mocks)
    for (const key of ['aadhaar', 'aadhar', 'accountNumber', 'ifsc', 'videoKycRoomId', 'license', 'rc']) {
        assert.equal((await vehicle.POST(jsonRequest({ ...profile, [key]: 'dummy' }))).status, 400)
    }
    assert.equal(f.writes, 0)
    await vehicle.POST(jsonRequest(profile)); f.setRole('partner')
    const pricing = load('app/api/partner/onboarding/pricing/route.ts', f.mocks)
    const before = f.writes
    assert.equal((await pricing.POST(pricingRequest(true))).status, 400)
    assert.equal((await pricing.POST(pricingRequest(false, true))).status, 400)
    assert.equal(f.uploads, 0); assert.equal(f.writes, before)
    const submit = load('app/api/partner/onboarding/submit/route.ts', f.mocks)
    assert.equal((await submit.POST(jsonRequest({ bankAccount: 'dummy' }))).status, 400)
    assert.equal((await submit.POST(jsonRequest({}))).status, 409)
})

test('admin cannot onboard; unauthenticated calls and partner admin actions are denied', async () => {
    const f = fixture()
    const vehicle = load('app/api/partner/onboarding/vehicle/route.ts', f.mocks)
    f.setRole(null)
    assert.equal((await vehicle.POST(jsonRequest(profile))).status, 401)
    f.setRole('admin')
    assert.equal((await vehicle.POST(jsonRequest(profile))).status, 403)
    f.setRole('partner'); f.partner.role = 'partner'
    const approve = load('app/api/admin/reviews/partner/[id]/approve/route.ts', f.mocks)
    assert.equal((await approve.POST(jsonRequest({}), { params: Promise.resolve({ id: partnerId }) })).status, 403)
    assert.equal(f.writes, 0)
})

test('rejection and resubmission clear old decisions; editing an approved application requires review again', async () => {
    const f = fixture()
    const vehicle = load('app/api/partner/onboarding/vehicle/route.ts', f.mocks)
    const pricing = load('app/api/partner/onboarding/pricing/route.ts', f.mocks)
    const submit = load('app/api/partner/onboarding/submit/route.ts', f.mocks)
    await vehicle.POST(jsonRequest(profile)); f.setRole('partner')
    await pricing.POST(pricingRequest()); await submit.POST(jsonRequest({})); f.setRole('admin')
    const reject = load('app/api/admin/reviews/vehicle/[id]/reject/route.ts', f.mocks)
    const context = { params: Promise.resolve({ id: vehicleId }) }
    assert.equal((await reject.POST(jsonRequest({ reason: '' }), context)).status, 400)
    assert.equal((await reject.POST(jsonRequest({ reason: 'Please update vehicle information' }), context)).status, 200)
    assert.equal(f.partner.partnerStatus, 'rejected'); assert.equal(f.vehicle.status, 'rejected')
    f.setRole('partner'); await vehicle.POST(jsonRequest(profile)); await pricing.POST(pricingRequest()); await submit.POST(jsonRequest({}))
    assert.equal(f.partner.partnerStatus, 'pending'); assert.equal(f.partner.rejectionReason, undefined)
    f.setRole('admin')
    const approve = load('app/api/admin/reviews/vehicle/[id]/approve/route.ts', f.mocks)
    assert.equal((await approve.POST(jsonRequest({}), context)).status, 200)
    f.setRole('partner'); await vehicle.POST(jsonRequest(profile))
    assert.equal(f.partner.partnerStatus, 'pending'); assert.equal(f.vehicle.status, 'pending')
    assert.equal(f.partner.partnerApplicationSubmittedAt, undefined)
})

test('legacy user records serialize without stored verification fields, passwords or OTPs', () => {
    const User = load('models/user.model.ts').default
    const user = User.hydrate({ _id: partnerId, name: 'Test', email: 'test@example.invalid', password: 'dummy-hash', otp: 'dummy-code', videoKycStatus: 'approved', videoKycRoomId: 'dummy-room', videoKycRejectionReason: 'dummy-reason', accountNumber: 'dummy-account' })
    const result = JSON.parse(JSON.stringify(user))
    for (const key of ['password', 'otp', 'videoKycStatus', 'videoKycRoomId', 'videoKycRejectionReason', 'accountNumber']) assert.equal(result[key], undefined)
    assert.equal(result.name, 'Test')
    assert.equal(User.schema.path('videoKycStatus'), undefined)
})

test('nearby discovery returns only the fields needed for browsing and booking', async () => {
    let selection
    const route = load('app/api/vehicles/near-by/route.ts', {
        '@/lib/db': async () => {},
        '@/models/user.model': { find: async () => [{ _id: partnerId }] },
        '@/models/vehicle.model': { find: () => ({ select(fields) { selection = fields; return this }, lean: async () => [] }) }
    })
    assert.equal((await route.POST(jsonRequest({ latitude: 19, longitude: 72, vehicleType: 'car' }))).status, 200)
    assert.ok(selection.includes('pricePerKM')); assert.ok(selection.includes('owner'))
    assert.ok(!selection.includes('number')); assert.ok(!selection.includes('imageUrl'))
})

test('another rider cannot read a vehicle registration number through an active ride ID', async () => {
    let filter
    const route = load('app/api/user/active-ride/route.ts', {
        '@/auth': { auth: async () => ({ user: { email: 'rider@example.invalid' } }) },
        '@/lib/db': async () => {},
        '@/models/user.model': { findOne: () => query({ _id: 'current-rider' }) },
        '@/models/booking.model': { findOne: value => { filter = value; return query(null) } }
    })
    assert.equal((await route.POST(jsonRequest({ bookingId: 'someone-elses-ride' }))).status, 404)
    assert.equal(filter.user, 'current-rider')
})

test('booking creation, acceptance, pickup OTP and cash/drop lifecycle retain their contracts', async () => {
    const events = []
    let booking
    const mocks = {
        '@/auth': { auth: async () => ({ user: { id: 'rider', email: 'rider@example.invalid' } }) },
        '@/lib/db': async () => {},
        '@/models/user.model': { findOne: async () => ({ _id: 'rider' }), findById: async () => ({ _id: partnerId, mobileNumber: '9876543210' }) },
        '@/models/booking.model': {
            findOne: async () => null,
            create: async value => (booking = { ...value, _id: 'ride', user: { email: 'rider@example.invalid' }, async save() {} }),
            findById: () => query(booking)
        },
        '@/lib/sendMail': { sendMail: async () => {} },
        axios: { post: async (_url, value) => { events.push(value.event) } }
    }
    const create = load('app/api/booking/create/route.ts', mocks)
    assert.equal((await create.POST(jsonRequest({ driverId: partnerId, vehicleId, pickUpAddress: 'Pickup', dropAddress: 'Drop', pickUpLocation: { coordinates: [72,19] }, dropLocation: { coordinates: [73,20] }, fare: 100, mobileNumber: '9876543210' }))).status, 200)
    assert.equal(booking.bookingStatus, 'requested')
    const context = { params: Promise.resolve({ id: 'ride' }) }
    await load('app/api/partner/bookings/[id]/accept/route.ts', mocks).GET(jsonRequest({}), context)
    assert.equal(booking.bookingStatus, 'awaiting_payment')
    await load('app/api/booking/[id]/confirm/route.ts', mocks).GET(jsonRequest({}), context)
    assert.equal(booking.paymentStatus, 'cash'); assert.equal(booking.bookingStatus, 'confirmed')
    for (const stage of ['pickup', 'drop']) {
        await load(`app/api/partner/bookings/otp/${stage}/send/route.ts`, mocks).POST(jsonRequest({ bookingId: 'ride' }))
        const otp = stage === 'pickup' ? booking.pickUpOtp : booking.dropOtp
        assert.ok(otp)
        await load(`app/api/partner/bookings/otp/${stage}/verify/route.ts`, mocks).POST(jsonRequest({ bookingId: 'ride', otp }))
        assert.equal(booking.bookingStatus, stage === 'pickup' ? 'started' : 'completed')
    }
    assert.equal(booking.partnerAmount, 90); assert.equal(booking.adminCommission, 10)
    assert.deepEqual(events, ['new-booking', 'accept-booking'])
})

test('Razorpay order creation and signature verification still confirm a paid booking', async () => {
    const booking = { _id: 'ride', fare: 100, async save() {} }
    const mocks = {
        '@/lib/db': async () => {},
        '@/models/booking.model': { findById: async () => booking },
        '@/lib/razorpay': { orders: { create: async value => { assert.equal(value.amount, 10000); return { id: 'test-order', amount: value.amount } } } }
    }
    const create = load('app/api/payment/create/route.ts', mocks)
    assert.equal((await create.POST(jsonRequest({ bookingId: 'ride' }))).status, 200)
    const previous = process.env.RAZORPAY_KEY_SECRET
    try {
        process.env.RAZORPAY_KEY_SECRET = 'synthetic-test-secret'
        const signature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update('test-order|test-payment').digest('hex')
        const response = await load('app/api/payment/verify/route.ts', mocks).POST(jsonRequest({ bookingId: 'ride', razorpay_order_id: 'test-order', razorpay_payment_id: 'test-payment', razorpay_signature: signature }))
        assert.equal((await response.json()).success, true)
        assert.equal(booking.paymentStatus, 'paid'); assert.equal(booking.bookingStatus, 'confirmed')
    } finally {
        if (previous === undefined) delete process.env.RAZORPAY_KEY_SECRET
        else process.env.RAZORPAY_KEY_SECRET = previous
    }
})

test('chat persistence and Gemini quick replies retain their request/response contracts', async () => {
    const messages = []
    const mocks = {
        '@/lib/db': async () => {},
        '@/models/chatMessage.model': { create: async value => { messages.push(value); return value }, find: async () => messages },
        axios: { post: async () => ({ data: { candidates: [{ content: { parts: [{ text: '{"suggestions":["Arriving soon","Thank you","See you shortly"]}' }] } }] } }) }
    }
    const message = { bookingId: 'ride', sender: 'user', text: 'See you soon' }
    assert.equal((await load('app/api/chat/send/route.ts', mocks).POST(jsonRequest(message))).status, 200)
    assert.equal((await (await load('app/api/chat/get-all/route.ts', mocks).POST(jsonRequest({ bookingId: 'ride' }))).json()).length, 1)
    const response = await load('app/api/chat/ai-suggestions/route.ts', mocks).POST(jsonRequest({ role: 'DRIVER', lastMessage: message.text }))
    assert.equal(JSON.parse(await response.json()).suggestions.length, 3)
})

test('Socket.IO ride rooms, location and chat events still work without verification fields', async () => {
    let connect
    const handlers = {}, emitted = [], updates = []
    const io = { on: (_event, callback) => { connect = callback }, to: room => ({ emit: (event, data) => emitted.push({ room, event, data }) }) }
    const express = Object.assign(() => ({ use() {}, post() {} }), { json: () => {} })
    const mocks = {
        express, dotenv: { config() {} }, mongoose: { connect: async () => {} },
        http: { createServer: () => ({ listen() {} }) },
        'socket.io': { Server: function () { return io } },
        './models/user.model.js': { findByIdAndUpdate: async (id, value) => updates.push({ id, value }) }
    }
    load('../../socketServer/index.js', mocks)
    const socket = { id: 'socket', on: (event, callback) => { handlers[event] = callback }, join: room => assert.equal(room, 'ride-ride') }
    connect(socket)
    await handlers.identity(partnerId)
    await handlers['update-location']({ userId: partnerId, latitude: 19, longitude: 72 })
    handlers['join-ride']('ride')
    handlers['driver-location-update']({ bookingId: 'ride', latitude: 19, longitude: 72 })
    handlers['chat-message']({ bookingId: 'ride', text: 'Hello' })
    assert.deepEqual(emitted.map(value => value.event), ['driver-location', 'chat-message'])
    assert.ok(emitted.every(value => value.room === 'ride-ride'))
    await handlers.disconnect()
    assert.equal(updates.at(-1).value.isOnline, false)
})

test('credentials, first Google sign-in and refreshed partner/admin roles remain functional', async () => {
    let config, dbUser = null
    load('auth.ts', {
        'next-auth': value => { config = value; return {} },
        'next-auth/providers/credentials': value => value,
        'next-auth/providers/google': value => value,
        './lib/db': async () => {},
        './models/user.model': {
            findOne: () => query(dbUser),
            create: async value => (dbUser = { ...value, _id: partnerId, role: 'user' })
        },
        bcryptjs: { compare: async (input, hash) => input === 'test-password' && hash === 'test-hash' }
    })
    const googleUser = { name: 'Test', email: 'test@example.invalid' }
    assert.equal(await config.callbacks.signIn({ user: googleUser, account: { provider: 'google' } }), true)
    assert.equal(googleUser.id, partnerId)
    dbUser.password = 'test-hash'
    assert.equal((await config.providers[0].authorize({ email: googleUser.email, password: 'test-password' })).id, partnerId)
    await assert.rejects(() => config.providers[0].authorize({ email: googleUser.email, password: 'wrong' }))
    for (const role of ['partner', 'admin']) {
        dbUser.role = role
        const token = await config.callbacks.jwt({ token: { email: googleUser.email, role: 'user' } })
        const session = await config.callbacks.session({ token, session: { user: {} } })
        assert.equal(session.user.role, role)
    }
})
