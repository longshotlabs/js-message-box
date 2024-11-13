/**
 * We have relatively simple deep merging requirements in this package.
 * We are only ever merging messages config, so we know the structure,
 * we know there are no arrays, and we know there are no constructors
 * or weirdly defined properties.
 *
 * Thus, we can write a very simplistic deep merge function to avoid
 * pulling in a large dependency.
 */

export default function merge (destination: Record<string, unknown>, ...sources: Array<Record<string, unknown>>): Record<string, unknown> {
  sources.forEach((source) => {
    Object.keys(source).forEach((prop) => {
      if (
        source[prop]?.constructor === Object
      ) {
        if (destination[prop]?.constructor !== Object) {
          const temp: Record<string, unknown> = {}
          destination[prop] = temp
        }
        merge(destination[prop] as Record<string, unknown>, source[prop] as Record<string, unknown>)
      } else {
        destination[prop] = source[prop]
      }
    })
  })

  return destination
}
