import React, { createContext, useContext, useEffect, useState } from 'react'
import axios from 'axios'

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api'

axios.defaults.baseURL = API

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('qf_token'))

  useEffect(() => {
    const initializeAuth = async () => {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        axios.defaults.headers.common.Authorization = `Bearer ${token}`

        const res = await axios.get('/auth/me')

        setUser(res.data)
      } catch (error) {
        console.error('Authentication initialization failed:', error)

        localStorage.removeItem('qf_token')
        delete axios.defaults.headers.common.Authorization

        setToken(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()
  }, [token])

  const login = async (email, password) => {
    const res = await axios.post('/auth/login', {
      email,
      password
    })

    const newToken = res.data.token

    localStorage.setItem('qf_token', newToken)

    axios.defaults.headers.common.Authorization = `Bearer ${newToken}`

    setToken(newToken)
    setUser(res.data.user)

    return res.data
  }

  const register = async (name, email, password) => {
    const res = await axios.post('/auth/register', {
      name,
      email,
      password
    })

    const newToken = res.data.token

    localStorage.setItem('qf_token', newToken)

    axios.defaults.headers.common.Authorization = `Bearer ${newToken}`

    setToken(newToken)
    setUser(res.data.user)

    return res.data
  }

  const logout = () => {
    localStorage.removeItem('qf_token')

    delete axios.defaults.headers.common.Authorization

    setToken(null)
    setUser(null)
  }

  const updateUser = (updatedUser) => {
    setUser(updatedUser)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        token,
        login,
        register,
        updateUser,
        logout,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export default AuthContext