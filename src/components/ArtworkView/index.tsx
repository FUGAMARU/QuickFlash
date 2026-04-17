import { Canvas } from "@react-three/fiber"
import { useEffect, useRef } from "react"
import * as THREE from "three"

import { useArtworkViewScene } from "@/components/ArtworkView/index.hook"
import styles from "@/components/ArtworkView/index.module.css"
import { isDefined } from "@/utils"

type Props = {
  artworkUrl: string
}

export const ArtworkView = ({ artworkUrl }: Props) => {
  const {
    alphaTexture,
    artworkSize,
    artworkThickness,
    frontTexture,
    highlightTexture,
    reflectionGeometry,
    reflectionTexture
  } = useArtworkViewScene({ artworkUrl })

  const spotLightRef = useRef<THREE.SpotLight | null>(null)
  const spotLightTargetRef = useRef<THREE.Object3D | null>(null)

  useEffect(() => {
    const spotLight = spotLightRef.current
    const spotLightTarget = spotLightTargetRef.current

    if (!isDefined(spotLight) || !isDefined(spotLightTarget)) {
      return
    }

    spotLight.target = spotLightTarget
  }, [])

  return (
    <div className={styles.artworkView}>
      <Canvas
        camera={{
          far: 100,
          fov: 45,
          near: 0.1,
          position: [0, 0, 20]
        }}
        dpr={[1, 2]}
        gl={{
          antialias: true
        }}
        onCreated={({ camera, gl }) => {
          camera.lookAt(0, 0, 0)
          gl.outputColorSpace = THREE.SRGBColorSpace
          gl.toneMapping = THREE.NoToneMapping
        }}
        shadows
      >
        <color args={["#151515"]} attach="background" />

        <mesh castShadow>
          <boxGeometry args={[artworkSize, artworkSize, artworkThickness]} />
          <meshStandardMaterial attach="material-0" color={0x111111} roughness={0.8} />
          <meshStandardMaterial attach="material-1" color={0x111111} roughness={0.8} />
          <meshStandardMaterial attach="material-2" color={0x111111} roughness={0.8} />
          <meshStandardMaterial attach="material-3" color={0x111111} roughness={0.8} />
          <meshBasicMaterial
            attach="material-4"
            color={0xffffff}
            map={frontTexture}
            toneMapped={false}
          />
          <meshStandardMaterial attach="material-5" color={0x111111} roughness={0.8} />

          {isDefined(highlightTexture) && (
            <mesh position={[0, 0, artworkThickness / 2 + 0.01]}>
              <planeGeometry args={[artworkSize, artworkSize]} />
              <meshBasicMaterial
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                map={highlightTexture}
                toneMapped={false}
                transparent
              />
            </mesh>
          )}
        </mesh>

        <mesh position={[0, 0, -10]} receiveShadow>
          <planeGeometry args={[150, 100]} />
          <meshStandardMaterial color={0x151515} metalness={0.1} roughness={0.9} />
        </mesh>

        <mesh
          geometry={reflectionGeometry}
          position={[0, -artworkSize / 2 - 0.5, artworkThickness / 2]}
          rotation={[-Math.PI / 2.5, 0, 0]}
        >
          <meshBasicMaterial
            alphaMap={alphaTexture}
            color={0xffffff}
            depthWrite={false}
            map={reflectionTexture}
            toneMapped={false}
            transparent
          />
        </mesh>

        <ambientLight intensity={0.4} />
        <spotLight
          ref={spotLightRef}
          angle={Math.PI / 4}
          castShadow
          decay={2}
          distance={150}
          intensity={8000}
          penumbra={0.5}
          position={[0, 30, 15]}
          shadow-mapSize-height={2048}
          shadow-mapSize-width={2048}
        />
        <object3D ref={spotLightTargetRef} position={[0, 0, -10]} />
      </Canvas>
    </div>
  )
}
