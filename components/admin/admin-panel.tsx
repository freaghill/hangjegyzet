'use client'

import { Admin, Resource, ListGuesser, EditGuesser } from 'react-admin'
import simpleRestProvider from 'ra-data-simple-rest'

const dataProvider = simpleRestProvider('/api/admin')

export function AdminPanel() {
  return (
    <Admin dataProvider={dataProvider}>
      <Resource name="users" list={ListGuesser} edit={EditGuesser} />
      <Resource name="organizations" list={ListGuesser} edit={EditGuesser} />
      <Resource name="meetings" list={ListGuesser} />
      <Resource name="subscriptions" list={ListGuesser} edit={EditGuesser} />
    </Admin>
  )
}