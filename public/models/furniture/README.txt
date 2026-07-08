Kenney Furniture Kit (CC0) goes here — https://kenney.nl/assets/furniture-kit

The house engine (src/world/) references these files via the asset registry in
src/world/HouseAssets.ts. Until the GLBs are present, every object renders as a
readable coloured placeholder box, so the house is fully playable right now.

Expected filenames (edit HouseAssets.ts if your extract differs — that registry
is the ONLY place paths live):

  Shell
    floorFull.glb           floor
    wall.glb                straight wall (also reused for end/post)
    wallCorner.glb          corner (T-junction = corner+wall, cross = 2 corners)
    wallDoorwayWide.glb     door
    wallWindowSlide.glb     window

  Living room / general
    loungeDesignSofa.glb    sofa
    tableCoffee.glb         coffee table
    rugRectangle.glb        rug
    lampRoundFloor.glb      lamp
    televisionModern.glb    tv
    pottedPlant.glb         plant
    tableCloth.glb          table
    chairCushion.glb        chair
    bookcaseClosed.glb      bookshelf
    desk.glb                desk

  Bedroom
    bedDouble.glb           bed
    cabinetBedDrawer.glb    nightstand
    cabinetBedDrawerTall.glb dresser

  Kitchen
    kitchenFridge.glb       refrigerator
    kitchenMicrowave.glb    microwave
    bowlFruit.glb           fruit bowl
    kitchenToaster.glb      toaster
    kitchenCabinetUpper.glb cabinet

  Bathroom
    toilet.glb              toilet
    bathtub.glb             bathtub
    bathroomSink.glb        sink

Keep each GLB beside its Textures/ folder if the kit uses external textures, so
the relative colormap references resolve. Run `npm run compress` after adding.
