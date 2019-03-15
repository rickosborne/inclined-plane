import {testableType} from "../ts";

export interface Simple {
}

export const Simple = testableType<Simple>('SimpleTest');
