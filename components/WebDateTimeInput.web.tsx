import React from 'react'

export default function WebDateTimeInput({ value, onChange, style }: any) {
  return <input type="datetime-local" value={value} onChange={onChange} style={style} />
}
