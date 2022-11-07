import React from 'react'
import { Link } from 'react-router-dom'

const Login = () => {
  const [akun, setAkun] = React.useState({ email: '', password: '' })

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (akun.email === 'admin' && akun.password === 'admin') {
      window.location.href = '/'
    } else if (
      akun.email === 'karyawan' &&
      akun.password === 'karyawan'
    ) {
      window.location.href = '/karyawan'
    } else {
      alert('Email atau password salah')
    }
  }

  return (
    <div className='flex justify-center items-center h-screen bg-black'>
      <form
        className='bg-gray-600 rounded-lg w-1/2 p-10'
        onSubmit={handleSubmit}>
        <h1 className='mb-4 text-3xl text-white uppercase font-bold'>
          login account
        </h1>
        <div className='mb-4'>
          <label className='block text-black font-semibold text-lg mb-2'>
            Nama atau Email
          </label>
          <input
            className='focus:ring-2 focus:ring-black focus:outline-none appearance-none w-full text-sm leading-6 text-slate-900 placeholder-primary rounded-md py-2 pl-5 ring-1 ring-slate-200 shadow-sm bg-formInput'
            type='text'
            aria-label='nama atau email'
            placeholder='nama atau email'
            value={akun.email}
            onChange={(e) =>
              setAkun({ ...akun, email: e.target.value })
            }
          />
        </div>
        <div className='mb-6'>
          <label className='block text-black font-semibold text-lg mb-2'>
            Password
          </label>
          <input
            className='focus:ring-2 focus:ring-black focus:outline-none appearance-none w-full text-sm leading-6 text-slate-900 placeholder-primary rounded-md py-2 pl-5 ring-1 ring-slate-200 shadow-sm bg-formInput'
            type='password'
            aria-label='password'
            placeholder='password'
            value={akun.password}
            onChange={(e) =>
              setAkun({ ...akun, password: e.target.value })
            }
          />
        </div>
        <div className='flex items-center justify-between'>
          <Link
            to='/register'
            className='bg-black hover:bg-white hover:text-black text-white font-bold py-2 px-4 rounded transition-all duration-300 uppercase'
            type='submit'>
            register
          </Link>
          <div className='flex flex-row gap-5'>
            <button
              className='bg-black hover:bg-white hover:text-black text-white font-bold py-2 px-4 rounded transition-all duration-300'
              type='submit'>
              Reset
            </button>
            <button
              className='bg-blue-700 hover:bg-blue-900 text-white font-bold py-2 px-4 rounded transition-all duration-300'
              type='submit'>
              Submit
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default Login