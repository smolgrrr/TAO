import { useParams } from 'react-router-dom';
import { useState } from "react";
import { Event, nip19 } from "nostr-tools"
import { subNotesOnce } from '../../utils/subscriptions';
import { useEffect } from 'react';
import { uniqBy } from '../../utils/otherUtils';
import Placeholder from '../modals/Placeholder';
import PostCard from '../modals/PostCard';
import { useFetchEvents } from '../../hooks/useFetchEvents';
import ThreadPostModal from '../forms/ThreadPostModal';

const Thread = () => {
    const { id } = useParams();
    const [prevMentions, setPrevMentions] = useState<Event[]>([]);
    let decodeResult = nip19.decode(id as string);
    let hexID = decodeResult.data as string;
    const { noteEvents, metadataEvents } = useFetchEvents(undefined,false,hexID);
    // Load cached thread from localStorage
    const threadCache = JSON.parse(sessionStorage.getItem("cachedThread") || "[]")

    // Combine noteEvents and threadCache into a single array
    const allEvents = [...noteEvents, ...threadCache];

    const repliedList = (event: Event): Event[] => {
        return allEvents
            .filter(e => event.tags.some(tag => tag[0] === 'p' && tag[1] === e.pubkey))
    }

    // Define your callback function for subGlobalFeed
    const onEvent = (event: Event) => {
        setPrevMentions((prevEvents) => [...prevEvents, event]);
    };

    const OPEvent: Event = allEvents.find(event => event.id === hexID);
    useEffect(() => {
        if (OPEvent && prevMentions.length === 0) {
            const OPMentionIDs = OPEvent.tags.filter(tag => tag[0] === 'e').map(tag => tag[1]);
            subNotesOnce(OPMentionIDs, onEvent);
        }
    }, [OPEvent]);

    if (OPEvent) {
        const uniqEvents = uniqBy(prevMentions, "id");
        const earlierEvents = uniqEvents
        .filter(e =>
            e.created_at < OPEvent.created_at
        )
        
        const uniqReplyEvents = uniqBy(allEvents, "id");
        const replyEvents = [...uniqReplyEvents]
        .filter(event => 
            !earlierEvents.map(e => e.id).includes(event.id) &&
            (OPEvent ? OPEvent.id !== event.id : true)
        ).sort((a, b) => a.created_at - b.created_at);
        
    return (
        <>
            <main className="bg-black text-white min-h-screen">
                <div className="w-full sm:px-0 sm:max-w-xl mx-auto my-2">
                    {earlierEvents
                        .filter(event => event.kind === 1)
                        .sort((a, b) => a.created_at - b.created_at).map((event, index) => (
                            <PostCard key={event.id} event={event} metadata={metadataEvents.find((e) => e.pubkey === event.pubkey && e.kind === 0) || null} replies={uniqEvents.filter((e: Event) => e.tags.some((tag) => tag[0] === "e" && tag[1] === event.id))} />
                        ))}
                    <PostCard key={OPEvent.id} event={OPEvent} metadata={metadataEvents.find((e) => e.pubkey === OPEvent.pubkey && e.kind === 0) || null} replies={replyEvents} type={'OP'}/>
                </div>
                <ThreadPostModal OPEvent={OPEvent} />
                <div className="col-span-full h-0.5 bg-neutral-900 mb-2"/> {/* This is the white line separator */}
                <div className="grid grid-cols-1 max-w-xl mx-auto gap-1">
                    {replyEvents.map((event: Event) => (
                        <div className={`w-11/12 ${event.tags.find(tag => tag[0] === 'e' && tag[1] !== OPEvent.id) ? 'ml-auto' : 'mr-auto'}`}>
                        <PostCard 
                        key={event.id} 
                        event={event} 
                        metadata={metadataEvents.find((e) => e.pubkey === event.pubkey && e.kind === 0) || null} 
                        replies={replyEvents.filter((e: Event) => e.tags.some((tag) => tag[0] === "e" && tag[1] === event.id))} 
                        repliedTo={repliedList(event)} 
                        />
                        </div>
                    ))}
                </div>
            </main>
        </>
    );
    }
    return (
        <>
            <Placeholder />
            <div className="col-span-full h-0.5 bg-neutral-900"/> {/* This is the white line separator */}
        </>
    );
};

export default Thread;