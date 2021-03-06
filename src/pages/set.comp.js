import React, {useState, useEffect} from "react"
import {useParams} from "react-router-dom"
import styled from "styled-components"

import ReactDatatable from '@ashvin27/react-datatable'

import * as fcl from "@onflow/fcl"
const Red = styled.span`
  color: red;
`
const Green = styled.span`
  color: green;
`
const Muted = styled.span`
  color: #78899a;
`

const getTopshotSet = async (setID) => {
  const resp = await fcl.send([
    fcl.script`
      import TopShot from 0x${window.topshotAddress}
      pub struct Edition {
        pub let playID: UInt32
        pub let retired: Bool
        pub let momentCount: UInt32
        pub let playOrder: UInt32
        init(playID: UInt32, retired: Bool, momentCount: UInt32, playOrder: UInt32) {
          self.playID = playID
          self.retired = retired
          self.momentCount = momentCount
          self.playOrder = playOrder
        }
      }
      pub struct Set {
        pub let id: UInt32
        pub let setName: String
        pub let playIDs: [UInt32]
        pub let editions: [Edition]
        pub var locked: Bool
        init(id: UInt32, setName: String) {
          self.id = id
          self.setName = setName
          self.playIDs = TopShot.getPlaysInSet(setID: id)!
          self.locked = false
          self.locked = TopShot.isSetLocked(setID: id)!
          var editions: [Edition] = []
          var playOrder = UInt32(1)
          for playID in self.playIDs {
            var retired = false
            retired = TopShot.isEditionRetired(setID: id, playID: playID)!
            var momentCount = UInt32(0)
            momentCount = TopShot.getNumMomentsInEdition(setID: id, playID: playID)!
            editions.append(Edition(playID: playID, retired: retired, momentCount: momentCount, playOrder: playOrder))
            playOrder = playOrder + UInt32(1)
          }
          self.editions = editions
        }
      }
      pub struct TopshotSet {
        pub let set: Set
        pub let plays: [TopShot.Play]

        init() {
            var setName = TopShot.getSetName(setID: ${setID})
            self.set = Set(id: ${setID}, setName: setName!)
            self.plays = TopShot.getAllPlays()
          }
      }
      pub fun main(): TopshotSet {
        return TopshotSet()
      } `,
  ])
  return fcl.decode(resp)
}
const Root = styled.div`
  font-size: 13px;
  padding: 21px;
`

const columns = [
  {
    key: "playOrder",
    text: "Creation Order",
    align: "left",
    sortable: true,
  },
  {
      key: "playID",
      text: "Play ID",
      align: "left",
      sortable: true,
  },
  {
    key: "retired",
    text: "Retired",
    align: "left",
    sortable: true,
  },
  {
      key: "fullName",
      text: "Full Name",
      align: "left",
      sortable: true
  },
  {
      key: "playType",
      text: "Play Type",
      sortable: true
  },
  {
      key: "totalMinted",
      text: "Total Minted",
      align: "left",
      sortable: true
  },
];

const config = {
  page_size: 10,
  length_menu: [ 10, 20, 50 ],
  no_data_text: 'No data available!',
  sort: { column: "playOrder", order: "desc" }
}

export function TopshotSet() {
  const [error, setError] = useState(null)
  const {setID} = useParams()
  const [TopshotSet, setTopshotSet] = useState(null)
  useEffect(() => {
    getTopshotSet(setID).then(
      (topshotSet) => {
        console.log(topshotSet)
        setTopshotSet(topshotSet)
      }).catch(setError)
  }, [setID])
  const getPlay = (playID) => {
    return (
      TopshotSet &&
      TopshotSet.plays.filter((play) => {
        return play.playID === playID
      })
    )
  }
  if (error != null)
    return (
      <Root>
        <h3>
          <span>Could NOT fetch info for: {setID}</span>
        </h3>
      </Root>
    )

  if (TopshotSet == null)
    return (
      <Root>
        <h3>
          <span>Fetching Set: {setID}</span>
        </h3>
      </Root>
    )
  
  const data = TopshotSet.set.editions?.map((edition) => {
    var play = getPlay(edition.playID)[0]
    return {playID: play.playID, retired: edition.retired ? <Red>retired</Red> : <Green>open</Green>, fullName: play.metadata.FullName,
      playType: play.metadata.PlayType, totalMinted: edition.momentCount, playOrder: edition.playOrder}
  })
  return (
    <Root>
      <h1>
        <Muted>{TopshotSet.set.setName}</Muted>:{" "}
        {TopshotSet.set.locked ? <Red>locked set</Red> : <Green>open set</Green>}
      </h1>
      <ReactDatatable
        config={config}
        records={data}
        columns={columns}
        extraButtons={[]}
      />
    </Root>
  )
}
