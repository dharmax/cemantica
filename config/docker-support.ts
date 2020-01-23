import hostIp from 'docker-host-ip'

let dockerHostIp

// get the docker host ip, if it's in a docker
export function getDockerHostIp(): Promise<string> {
    return new Promise((resolve, reject) => {
            if (!dockerHostIp) {
                hostIp((e, r) => {
                    if (r)
                        return dockerHostIp = r
                    else
                        resolve(null)
                })
            } else
                resolve(dockerHostIp)


        }
    )
}