'use client'
import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from "motion/react"
import axios from 'axios'
import { BookingStatus, PaymentStatus } from '@/models/booking.model'
import { Clock, IndianRupee, Loader2, MapPin, Navigation, Power, PowerOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getSocket } from '@/lib/socket'
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/store'

interface IBooking {
    _id: string
    user: string
    driver: string
    vehicle: string
    pickUpAddress: string
    dropAddress: string
    pickUpLocation: { type: "Point"; coordinates: [number, number] }
    dropLocation: { type: "Point"; coordinates: [number, number] }
    fare: number
    userMobileNumber: string
    driverMobileNumber: string
    bookingStatus: BookingStatus
    paymentStatus: PaymentStatus
    paymentDeadline: Date
    adminCommission: number
    partnerAmount: number
    pickUpOtp: string
    pickUpOtpExpires: Date
    dropOtp: string
    dropOtpExpires: Date
    createdAt?: Date
    updatedAt?: Date
}

function page() {
    const [bookings, setBookings] = useState<IBooking[]>([])
    const [loading, setLoading] = useState(false)
    const [isOnline, setIsOnline] = useState(false)
    const [togglingOnline, setTogglingOnline] = useState(false)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const router = useRouter()
    const { userData } = useSelector((state: RootState) => state.user)

    const fetchPendingRequests = async () => {
        try {
            setLoading(true)
            const { data } = await axios.get('/api/partner/bookings/pending')
            setBookings(data)
        } catch (error) {
            console.error('[PENDING] fetch error:', error)
        } finally {
            setLoading(false)
        }
    }

    const toggleOnline = async () => {
        try {
            setTogglingOnline(true)
            const newState = !isOnline
            await axios.post('/api/partner/online', { isOnline: newState })
            setIsOnline(newState)
            if (newState) {
                // re-fetch pending requests when going online
                await fetchPendingRequests()
            }
        } catch (error: any) {
            const msg = error?.response?.data?.message || 'Failed to update status'
            alert(msg)
        } finally {
            setTogglingOnline(false)
        }
    }

    const handleAccept = async (id: string) => {
        try {
            setActionLoading(id + '-accept')
            await axios.get(`/api/partner/bookings/${id}/accept`)
            router.push('/partner/bookings')
        } catch (error: any) {
            alert(error?.response?.data?.message || 'Failed to accept ride')
        } finally {
            setActionLoading(null)
        }
    }

    const handleReject = async (id: string) => {
        try {
            setActionLoading(id + '-reject')
            await axios.get(`/api/partner/bookings/${id}/reject`)
            setBookings(prev => prev.filter(b => b._id !== id))
        } catch (error: any) {
            alert(error?.response?.data?.message || 'Failed to reject ride')
        } finally {
            setActionLoading(null)
        }
    }

    useEffect(() => {
        fetchPendingRequests()
    }, [])

    useEffect(() => {
        const socket = getSocket()
        socket.on('new-booking', (data: IBooking) => {
            console.log('[SOCKET] new-booking received:', data._id)
            setBookings(prev => {
                // deduplicate
                if (prev.find(b => b._id === data._id)) return prev
                return [...prev, data]
            })
        })
        return () => { socket.off('new-booking') }
    }, [])

    return (
        <div className='min-h-screen bg-[#f4f5f7]'>
            <div className='bg-white border-b border-gray-200'>
                <div className='max-w-6xl mx-auto px-6 py-16'>
                    <div className='flex items-center justify-between flex-wrap gap-4'>
                        <div>
                            <h1 className='text-4xl font-semibold text-gray-900'>Ride Requests</h1>
                            <p className='mt-3 text-gray-500 text-lg'>Manage incoming ride requests and respond in real time.</p>
                        </div>

                        {/* Online/Offline Toggle */}
                        <motion.button
                            whileTap={{ scale: 0.96 }}
                            onClick={toggleOnline}
                            disabled={togglingOnline}
                            className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-semibold text-sm transition-all shadow-sm ${
                                isOnline
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300'
                            }`}
                        >
                            {togglingOnline
                                ? <Loader2 size={16} className='animate-spin' />
                                : isOnline
                                    ? <Power size={16} />
                                    : <PowerOff size={16} />
                            }
                            {isOnline ? 'Online — Ready for rides' : 'Offline — Go Online to receive rides'}
                        </motion.button>
                    </div>

                    {!isOnline && (
                        <div className='mt-4 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-amber-800 text-sm font-medium'>
                            ⚠️ You are currently <strong>offline</strong>. Click "Go Online" above to start receiving ride requests.
                        </div>
                    )}
                </div>
            </div>

            <div className='max-w-6xl mx-auto px-6 py-12'>
                {loading ? (
                    <div className='flex justify-center py-20'>
                        <Loader2 className="animate-spin w-8 h-8 text-gray-700" />
                    </div>
                ) : bookings.length === 0 ? (
                    <div className='bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-sm'>
                        <div className='w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4'>
                            <Navigation size={28} className='text-gray-400' />
                        </div>
                        <p className='text-gray-900 font-semibold text-lg mb-1'>No pending ride requests</p>
                        <p className='text-gray-500 text-sm'>
                            {isOnline
                                ? 'Waiting for users to book a ride near your location...'
                                : 'Go online to start receiving ride requests.'}
                        </p>
                    </div>
                ) : (
                    <div className='space-y-6'>
                        <AnimatePresence>
                            {bookings.map((b) => (
                                <motion.div
                                    key={b._id}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    whileHover={{ y: -2 }}
                                    transition={{ duration: 0.25 }}
                                    className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm hover:shadow-md transition"
                                >
                                    <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8'>
                                        <div className="flex-1 space-y-6">
                                            <div className='flex gap-4'>
                                                <div className='bg-gray-100 p-3 rounded-lg flex items-center justify-center'>
                                                    <MapPin size={18} />
                                                </div>
                                                <div>
                                                    <p className='text-xs uppercase text-gray-400 mb-1'>Pickup Location</p>
                                                    <p className='text-gray-900 font-medium'>{b.pickUpAddress}</p>
                                                </div>
                                            </div>

                                            <div className='flex gap-4'>
                                                <div className='bg-gray-100 p-3 rounded-lg flex items-center justify-center'>
                                                    <Navigation size={18} />
                                                </div>
                                                <div>
                                                    <p className='text-xs uppercase text-gray-400 mb-1'>Drop Location</p>
                                                    <p className='text-gray-900 font-medium'>{b.dropAddress}</p>
                                                </div>
                                            </div>

                                            <div className='flex items-center gap-2 text-sm text-gray-500 mt-2'>
                                                <Clock size={14} className="opacity-70" />
                                                <span className='font-medium'>
                                                    {new Date(b?.createdAt!).toLocaleString('en-IN', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                        </div>

                                        <div className='flex flex-col justify-between lg:items-end gap-6 w-full lg:w-auto'>
                                            <div className='text-left lg:text-right'>
                                                <p className='text-xs tracking-wide text-gray-400 uppercase mb-1'>Estimated Fare</p>
                                                <div className='flex items-center gap-2 text-3xl font-bold text-gray-900 lg:justify-end'>
                                                    <IndianRupee size={20} />
                                                    {b.fare}
                                                </div>
                                            </div>

                                            <div className='flex gap-4 w-full lg:w-auto'>
                                                <button
                                                    onClick={() => handleReject(b._id)}
                                                    disabled={actionLoading !== null}
                                                    className='flex-1 lg:flex-none px-6 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-100 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center'
                                                >
                                                    {actionLoading === b._id + '-reject'
                                                        ? <Loader2 size={16} className='animate-spin' />
                                                        : 'Reject'}
                                                </button>
                                                <button
                                                    onClick={() => handleAccept(b._id)}
                                                    disabled={actionLoading !== null}
                                                    className='flex-1 lg:flex-none px-8 py-3 rounded-xl bg-black text-white text-sm font-semibold shadow-md hover:bg-gray-900 hover:shadow-lg transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2'
                                                >
                                                    {actionLoading === b._id + '-accept'
                                                        ? <Loader2 size={16} className='animate-spin' />
                                                        : 'Accept Ride'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    )
}

export default page
