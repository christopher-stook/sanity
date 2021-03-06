import {get, flatten} from 'lodash'
import {error} from './validation/createValidationResult'

function createTypeWithMembersProblemsAccessor(
  memberPropertyName,
  getMembers = type => get(type, memberPropertyName)
) {
  return function getProblems(type, parentPath) {
    const currentPath = [...parentPath, {kind: 'type', type: type.type, name: type.name}]
    const members = getMembers(type) || []

    const memberProblems = Array.isArray(members)
      ? members.map(memberType => {
          const memberPath = [...currentPath, {kind: 'property', name: memberPropertyName}]
          return getTypeProblems(memberType, memberPath)
        })
      : [
          {
            path: currentPath,
            problems: [error(`Member declaration (${memberPropertyName}) is not an array`)]
          }
        ]

    return [
      {
        path: currentPath,
        problems: type._problems || []
      },
      ...flatten(memberProblems)
    ]
  }
}

const arrify = val => (Array.isArray(val) ? val : (typeof val === 'undefined' && []) || [val])

const getObjectProblems = createTypeWithMembersProblemsAccessor('fields')
const getArrayProblems = createTypeWithMembersProblemsAccessor('of')
const getReferenceProblems = createTypeWithMembersProblemsAccessor('to', type => arrify(type.to))
const getBlockAnnotationProblems = createTypeWithMembersProblemsAccessor('marks.annotations')
const getBlockMemberProblems = createTypeWithMembersProblemsAccessor('of')
const getBlockProblems = (...args) => [
  ...getBlockAnnotationProblems(...args),
  ...getBlockMemberProblems(...args)
]

function getDefaultProblems(type, path = []) {
  return [
    {
      path: [...path, {kind: 'type', type: type.type, name: type.name}],
      problems: type._problems || []
    }
  ]
}

export function getTypeProblems(type, path = []) {
  switch (type.type) {
    case 'object': {
      return getObjectProblems(type, path)
    }
    case 'document': {
      return getObjectProblems(type, path)
    }
    case 'array': {
      return getArrayProblems(type, path)
    }
    case 'reference': {
      return getReferenceProblems(type, path)
    }
    case 'block': {
      return getBlockProblems(type, path)
    }
    default: {
      return getDefaultProblems(type, path)
    }
  }
}

export default function groupProblems(types) {
  return flatten(types.map(type => getTypeProblems(type))).filter(type => type.problems.length > 0)
}
