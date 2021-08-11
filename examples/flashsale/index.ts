/*
 * Copyright (c) 2017, MegaEase
 * All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// This exports all functions required by Easegress
export * from '../../easegress/proxy'

import { Program, response, parseDate, cluster, rand, getUnixTimeInMs, registerProgramFactory, log, LogLevel } from '../../easegress'

class FlashSale extends Program {
	// permitted is the number of requests which are permitted to enter the
	// flash sale product page
	permitted: i32

	// maxPermission is the upper limits of permitted requests, 
	maxPermission: i32

	// blockRatio is the ratio of requests being blocked to protect backend service
	// for example: 0.4 means we blocks 40% of the requests randomly.
	blockRatio: f64

	// startTime is the start time of the flash sale
	startTime: i64

	constructor(params: Map<string, string>) {
		super(params)

		this.permitted = 0

		let key = "maxPermission"
		if (params.has(key)) {
			let val = params.get(key)
			this.maxPermission = i32(parseInt(val))
		}

		key = "blockRatio"
		if (params.has(key)) {
			let val = params.get(key)
			this.blockRatio = parseFloat(val)
		}

		key = "startTime"
		if (params.has(key)) {
			let val = params.get(key)
			this.startTime = parseDate(val).getTime()
		}
	}

	run(): i32 {
		super.run()
		let counter = cluster.addInt32("counter", 3)
		log(LogLevel.Warning, "counter is " + counter.toString())

		// if flash sale not start yet
		if (getUnixTimeInMs() < this.startTime) {
			// we just set response body to 'not start yet' here, in practice,
			// we will use 'response.setStatusCode(302)' to redirect user to
			// a static page.
			response.setBody(String.UTF8.encode("not start yet.\n"))
			return 1
		}

		if (this.permitted < this.maxPermission && rand() > this.blockRatio) {
			// the lucky guy
			this.permitted++
			return 0
		}

		// block this request, set response body to `sold out`
		response.setBody(String.UTF8.encode("sold out.\n"))
		return 2
	}
}

registerProgramFactory((params: Map<string, string>) => {
	return new FlashSale(params)
})
