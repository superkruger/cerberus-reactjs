import React, { useContext, useEffect, useState } from 'react'
import './Permissions.css'
import useFetch from '../../hooks/useFetch'
import Loader from '../../uikit/Loader'
import {
  Button,
  Container,
  Row,
  Col,
  Form,
  Table,
  Toast
} from 'react-bootstrap'
import { CerberusContext } from '../CerberusContext'
import useAccess from '../useAccess'

export default function Permissions(props) {
  const { resourceId, changeAction, onError } = props
  const cerberusCtx = useContext(CerberusContext)
  const { get, post, del, loading } = useFetch(
    cerberusCtx.apiHost + '/api/',
    cerberusCtx.apiTokenPair.accessToken,
    cerberusCtx.suffix
  )
  const [permissions, setPermissions] = useState([])
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [policies, setPolicies] = useState([])
  const [newPermittee, setNewPermittee] = useState()
  const [newPolicies, setNewPolicies] = useState([])
  const [activeInherit, setActiveInherit] = useState(false)
  const [hasParent, setHasParent] = useState(false)
  const [canChangePermissions, setCanChangePermissions] = useState(false)

  useAccess(resourceId, changeAction, setCanChangePermissions)

  useEffect(() => {
    getPermissions()

    get(`users`)
      .then((r) => {
        if (r) {
          setUsers(r)
        }
      })
      .catch((e) => {
        if (onError) {
          onError(e)
        }
        console.error(e)
      })

    get(`roles`)
      .then((r) => {
        if (r) {
          setRoles(r)
        }
      })
      .catch((e) => {
        if (onError) {
          onError(e)
        }
        console.error(e)
      })

    get(`resources/${resourceId}/policies`)
      .then((r) => {
        if (r) {
          setPolicies(r)
        }
      })
      .catch((e) => {
        if (onError) {
          onError(e)
        }
        console.error(e)
      })
  }, [resourceId])

  function getPermissions() {
    get(`resources/${resourceId}/permissions`)
      .then((r) => {
        if (r) {
          setPermissions(r)
          if (r.length > 0) {
            setActiveInherit(r[0].activeInherit)
            setHasParent(r[0].hasParent)
          }
        }
      })
      .catch((e) => {
        if (onError) {
          onError(e)
        }
        console.error(e)
      })
  }

  function handleInheritToggled(e) {
    post(`resources/${resourceId}/inheritance`, {
      activeInherit: !activeInherit
    })
      .then(() => {
        getPermissions()
      })
      .catch((e) => {
        if (onError) {
          onError(e)
        }
        console.error(e)
      })
  }

  function handlePolicyRemoveClicked(e) {
    const permissionId = e.target.getAttribute('data-val1')
    const policyId = e.target.getAttribute('data-val2')

    if (!permissionId || !policyId) {
      return
    }

    del(`permissions/${permissionId}/policies/${policyId}`)
      .then((r) => {
        setPermissions((prev) => [
          ...prev.filter((p) => p.id !== permissionId),
          r
        ])
      })
      .catch((e) => {
        if (onError) {
          onError(e)
        }
        console.error(e)
      })
  }

  function handlePolicySelected(e) {
    const permissionId = e.target.getAttribute('data-val1')
    const policyId = e.target.value
    if (!permissionId || !policyId) {
      return
    }

    post(`permissions/${permissionId}/policies/${policyId}`)
      .then((r) => {
        const permission = permissions.find((p) => p.id === permissionId)
        const policy = policies.find((p) => p.id === policyId)

        if (permission && policy) {
          permission.policies = [...permission.policies, policy]
          setPermissions((prev) => [
            ...prev.filter((p) => p.id !== permissionId),
            permission
          ])
        }
      })
      .catch((e) => {
        if (onError) {
          onError(e)
        }
        console.error(e)
      })
  }

  function handlePermissionRemoveClicked(e) {
    const permissionId = e.target.getAttribute('data-val1')
    if (!permissionId) {
      return
    }

    del(`permissions/${permissionId}`)
      .then((r) => {
        setPermissions((prev) =>
          prev.filter((perm) => perm.id !== permissionId)
        )
      })
      .catch((e) => {
        if (onError) {
          onError(e)
        }
        console.error(e)
      })
  }

  function handlePermissionAddClicked(e) {
    if (!newPermittee || newPolicies.length === 0) {
      return
    }

    post(`permissions`, {
      permitteeId: newPermittee,
      resourceId: resourceId,
      policyIds: newPolicies.map((p) => p.id)
    })
      .then((r) => setPermissions((prev) => [...prev, r]))
      .catch((e) => {
        if (onError) {
          onError(e)
        }
        console.error(e)
      })
      .finally(() => {
        setNewPermittee(null)
        setNewPolicies([])
      })
  }

  function handleNewPermitteeSelected(e) {
    setNewPermittee(e.target.value)
  }

  function handleNewPolicySelected(e) {
    const newPolicyId = e.target.value
    if (!newPolicies.find((p) => p.id === newPolicyId)) {
      const policy = policies.find((p) => p.id === newPolicyId)
      if (policy) {
        setNewPolicies((prev) => [...prev, policy])
      }
    }
  }

  function handleNewPolicyRemoveClicked(e) {
    const policyId = e.target.getAttribute('data-val2')
    if (!policyId) {
      return
    }

    setNewPolicies((prev) => prev.filter((p) => p.id !== policyId))
  }

  if (loading) {
    return <Loader />
  }

  return (
    <Table striped className='cerberus-permissions'>
      <thead>
        <tr>
          <th>Who</th>
          <th>How</th>
          <th>
            {hasParent && (
              <PrivateSwitch
                disabled={!canChangePermissions}
                activeInherit={activeInherit}
                onInheritToggled={handleInheritToggled}
              />
            )}
          </th>
        </tr>
      </thead>
      <tbody>
        {permissions.map((permission) => {
          return (
            <tr key={permission.id}>
              <td>
                {permission.permittee.displayName}
                {permission.inherited && (
                  <p>
                    <small>(shared)</small>
                  </p>
                )}
              </td>
              <td>
                {permission.policies.map((policy) => {
                  return (
                    <PolicyCard
                      disabled={!canChangePermissions}
                      key={policy.id}
                      permission={permission}
                      policy={policy}
                      onDeleteClicked={handlePolicyRemoveClicked}
                    />
                  )
                })}
                <span>
                  <Form.Select
                    disabled={!canChangePermissions || permission.inherited}
                    onChange={handlePolicySelected}
                    data-val1={permission.id}
                  >
                    <option value=''>Select Policy</option>
                    {policies.map((policy) => {
                      return (
                        <option key={policy.id} value={policy.id}>
                          {policy.name}
                        </option>
                      )
                    })}
                  </Form.Select>
                </span>
              </td>
              <td>
                <Button
                  disabled={!canChangePermissions || permission.inherited}
                  variant='danger'
                  onClick={handlePermissionRemoveClicked}
                  data-val1={permission.id}
                >
                  Remove
                </Button>
              </td>
            </tr>
          )
        })}
        <tr>
          <td>
            <Form.Select
              disabled={!canChangePermissions}
              onChange={handleNewPermitteeSelected}
            >
              <option value=''>Select Role or User</option>
              <optgroup label='Roles'>
                {roles.map((role) => {
                  return (
                    <option key={role.id} value={role.id}>
                      {role.displayName}
                    </option>
                  )
                })}
              </optgroup>
              <optgroup label='Users'>
                {users.map((user) => {
                  return (
                    <option key={user.id} value={user.id}>
                      {user.displayName}
                    </option>
                  )
                })}
              </optgroup>
            </Form.Select>
          </td>
          <td>
            {newPolicies.map((policy) => {
              return (
                <PolicyCard
                  key={policy.id}
                  policy={policy}
                  onDeleteClicked={handleNewPolicyRemoveClicked}
                />
              )
            })}
            <span>
              <Form.Select
                disabled={!canChangePermissions}
                onChange={handleNewPolicySelected}
              >
                <option value=''>Select Policy</option>
                {policies.map((policy) => {
                  return (
                    <option key={policy.id} value={policy.id}>
                      {policy.name}
                    </option>
                  )
                })}
              </Form.Select>
            </span>
          </td>
          <td>
            <Button
              variant='primary'
              disabled={
                !canChangePermissions ||
                !newPermittee ||
                newPolicies.length === 0
              }
              onClick={handlePermissionAddClicked}
            >
              Add
            </Button>
          </td>
        </tr>
      </tbody>
    </Table>
  )
}

function PolicyCard(props) {
  const { onDeleteClicked, permission, policy, disabled } = props

  const collapseId = permission ? permission.id + policy.id : policy.id
  const deleteDisabled = disabled || (permission ? permission.inherited : false)
  const permissionId = permission ? permission.id : ''

  return (
    <Toast className='d-inline-block m-1'>
      <Toast.Header closeButton={false}>
        <strong className='me-auto'>{policy.name}</strong>
        <Button
          data-bs-toggle='collapse'
          data-bs-target={`#a${collapseId}`}
          aria-expanded='false'
          aria-controls={`a${collapseId}`}
          variant='outline'
          size='sm'
        >
          &#x21F2;
        </Button>
      </Toast.Header>
      <Toast.Body className='collapse' id={`a${collapseId}`}>
        <Container>
          <Row>
            <Col sm={10}>{policy.description}</Col>
            <Col sm={2}>
              <Button
                disabled={deleteDisabled}
                data-val1={permissionId}
                data-val2={policy.id}
                onClick={onDeleteClicked}
                variant='outline-danger'
                size='sm'
              >
                x
              </Button>
            </Col>
          </Row>
        </Container>
      </Toast.Body>
    </Toast>
  )
}

function PrivateSwitch(props) {
  const { activeInherit, onInheritToggled, disabled } = props

  return (
    <Form.Switch
      disabled={disabled}
      label={activeInherit ? 'shared custody' : 'self custody'}
      checked={activeInherit}
      onChange={onInheritToggled}
    />
  )
}
